using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Dto;
using SosLocation.Application.Options;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.GeoProcessing.Seismic;

/// <summary>
/// Orquestra o motor sísmico sobre uma <see cref="SimulationRun"/>: constrói a
/// malha local, propaga o campo de onda a partir do hipocentro, extrai
/// acelerogramas por edifício e o raster de PGA, integra a resposta estrutural
/// (SDOF) e persiste os resultados. Espelha o <c>ImportPipeline</c> (estágios
/// guardados no próprio job/run, save após cada transição) mas vive na
/// GeoProcessing (não na Application) porque orquestra diretamente os
/// algoritmos puros deste pacote — mesma razão pela qual os normalizers vivem
/// aqui e não na Application, só que sem uma interface de estratégia
/// intermediária (não há múltiplas implementações concorrentes a escolher).
/// </summary>
public sealed class SeismicSimulationPipeline(
    IFeatureReader features,
    ISimulationRunStore runs,
    IElevationProvider elevationProvider,
    IObjectStorage objectStorage,
    IRasterImageEncoder rasterEncoder,
    IUnitOfWork unitOfWork,
    IServiceScopeFactory scopeFactory,
    SeismicOptions options,
    ILogger<SeismicSimulationPipeline> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Raio da Terra (m) — mesma constante usada por <see cref="SeismicGrid"/>, para manter a conversão grau↔metro consistente antes de a malha existir.</summary>
    private const double EarthRadiusMeters = 6_371_008.8;
    private const double GravityMps2 = 9.80665;
    private const int MaxRasterDimension = 512;
    private static readonly TimeSpan CancellationPollInterval = TimeSpan.FromSeconds(3);

    /// <summary>
    /// Envolve a execução com detecção de cancelamento externo: a API roda em
    /// outro processo e só consegue marcar o run como Cancelled no banco — sem
    /// isso, o worker continuaria consumindo rede/CPU num run já cancelado pelo
    /// usuário (e, pior, um Fail subsequente re-agendaria o run para retry).
    /// Um watcher concorrente (com seu próprio DbContext/scope) observa essa
    /// mudança e cancela um token vinculado que o resto do pipeline já respeita.
    /// </summary>
    public async Task ExecuteAsync(SimulationRun run, CancellationToken ct)
    {
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var watcherTask = WatchForExternalCancellationAsync(run.Id, linkedCts);

        try
        {
            await RunAsync(run, linkedCts.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogInformation("Simulation {RunId} stopped: cancelled externally.", run.Id);
        }
        finally
        {
            await linkedCts.CancelAsync();
            await watcherTask;
        }
    }

    private async Task WatchForExternalCancellationAsync(Guid runId, CancellationTokenSource linkedCts)
    {
        try
        {
            while (!linkedCts.IsCancellationRequested)
            {
                await Task.Delay(CancellationPollInterval, linkedCts.Token);

                using var scope = scopeFactory.CreateScope();
                var scopedRuns = scope.ServiceProvider.GetRequiredService<ISimulationRunStore>();
                var status = await scopedRuns.GetStatusAsync(runId, linkedCts.Token);
                if (status is SimulationRunStatus.Cancelled or SimulationRunStatus.Failed)
                {
                    await linkedCts.CancelAsync();
                    return;
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Encerramento normal: a execução principal terminou ou já foi cancelada.
        }
    }

    private async Task RunAsync(SimulationRun run, CancellationToken ct)
    {
        var parameters = JsonSerializer.Deserialize<EarthquakeParameters>(run.Parameters, JsonOptions)
            ?? throw new InvalidOperationException("Invalid earthquake parameters payload.");

        var buildings = await features.ListSimulationBuildingsAsync(run.CityRevisionId, ct);

        run.AdvanceStage(SimulationStage.PreparingDomain, 5, "Building simulation domain.");
        await unitOfWork.SaveChangesAsync(ct);

        var area = ComputeDomain(buildings, parameters);
        var spacing = ChooseSpacing(area);
        var grid = new SeismicGrid(area, spacing);

        var elevationPoints = new List<(double Lon, double Lat)>(grid.CellCount);
        for (var row = 0; row < grid.Rows; row++)
            for (var col = 0; col < grid.Cols; col++)
                elevationPoints.Add(grid.CellToLonLat(col, row));

        var elevations = await elevationProvider.SampleAsync(elevationPoints, ct) ?? new double[grid.CellCount];
        var vsField = SiteVs30Estimator.BuildShearVelocityField(
            elevations, grid, options.MinShearVelocityMps, options.MaxShearVelocityMps);

        run.SetIntensityBounds(area.West, area.South, area.East, area.North);
        run.AdvanceStage(SimulationStage.PreparingDomain, 15,
            $"Domain ready: {grid.Cols}x{grid.Rows} cells @ {spacing:0}m.");
        await unitOfWork.SaveChangesAsync(ct);

        var responses = await PropagateAndRespondAsync(run, grid, vsField, parameters, buildings, ct);

        run.AdvanceStage(SimulationStage.ComputingImpact, 85, "Integrating structural response.");
        await unitOfWork.SaveChangesAsync(ct);

        run.AdvanceStage(SimulationStage.PersistingResults, 92, "Persisting results.");
        await unitOfWork.SaveChangesAsync(ct);

        if (responses.Count > 0)
            await runs.BulkInsertResponsesAsync(responses, ct);

        run.Complete(DateTimeOffset.UtcNow);
        await unitOfWork.SaveChangesAsync(ct);

        logger.LogInformation(
            "Simulation {RunId} completed: {Buildings} buildings, grid {Cols}x{Rows}.",
            run.Id, buildings.Count, grid.Cols, grid.Rows);
    }

    private async Task<List<BuildingSeismicResponse>> PropagateAndRespondAsync(
        SimulationRun run, SeismicGrid grid, double[] vsField, EarthquakeParameters parameters,
        IReadOnlyList<SimulationBuildingInput> buildings, CancellationToken ct)
    {
        var wave = new ElasticWaveFdtd(grid.Cols, grid.Rows, grid.SpacingMeters, vsField, options.CourantNumber);
        var dt = wave.TimeStepSeconds;

        var maxVs = vsField.Length == 0 ? options.MinShearVelocityMps : vsField.Max();
        var domainDiagonalMeters = Math.Sqrt(
            Math.Pow(grid.Cols * grid.SpacingMeters, 2) + Math.Pow(grid.Rows * grid.SpacingMeters, 2));
        var totalSeconds = Math.Min(
            options.MaxSimulationSeconds, domainDiagonalMeters / Math.Max(maxVs, 1.0) * 1.5 + 5.0);
        var steps = Math.Min(options.MaxSimulationSteps, Math.Max(1, (int)Math.Ceiling(totalSeconds / dt)));

        var (sourceCol, sourceRow) = grid.LonLatToCell(parameters.EpicenterLon, parameters.EpicenterLat);
        var depthMeters = parameters.DepthKm * 1000.0;

        // Edifícios na mesma célula recebem exatamente o mesmo acelerograma. Se
        // também possuem o mesmo período natural, sua recorrência SDOF é
        // matematicamente idêntica e pode ser integrada uma única vez, sem
        // aproximação ou perda de informação.
        var sampleIndexByCell = new Dictionary<int, int>();
        var sampleCells = new List<int>();
        int GetSampleIndex(int cell)
        {
            if (sampleIndexByCell.TryGetValue(cell, out var existing)) return existing;
            var created = sampleCells.Count;
            sampleCells.Add(cell);
            sampleIndexByCell.Add(cell, created);
            return created;
        }

        var buildingGroupIndex = new int[buildings.Count];
        var buildingSampleIndexes = new HashSet<int>();
        var groupIndexByResponse = new Dictionary<(int SampleIndex, long PeriodBits), int>();
        var responseGroups = new List<ResponseGroup>();
        for (var i = 0; i < buildings.Count; i++)
        {
            var (col, row) = grid.LonLatToCell(buildings[i].Longitude, buildings[i].Latitude);
            var sampleIndex = GetSampleIndex(grid.Index(col, row));
            buildingSampleIndexes.Add(sampleIndex);
            var naturalPeriod = SdofResponseSolver.EstimatePeriodSeconds(buildings[i].HeightMeters);
            var key = (sampleIndex, BitConverter.DoubleToInt64Bits(naturalPeriod));
            if (!groupIndexByResponse.TryGetValue(key, out var groupIndex))
            {
                groupIndex = responseGroups.Count;
                responseGroups.Add(new ResponseGroup(
                    sampleIndex,
                    naturalPeriod,
                    new SdofOnlineIntegrator(dt, naturalPeriod, options.DampingRatio)));
                groupIndexByResponse.Add(key, groupIndex);
            }
            buildingGroupIndex[i] = groupIndex;
        }

        var rasterStrideCol = Math.Max(1, (int)Math.Ceiling(grid.Cols / (double)MaxRasterDimension));
        var rasterStrideRow = Math.Max(1, (int)Math.Ceiling(grid.Rows / (double)MaxRasterDimension));
        var rasterCols = (grid.Cols + rasterStrideCol - 1) / rasterStrideCol;
        var rasterRows = (grid.Rows + rasterStrideRow - 1) / rasterStrideRow;
        var peakPgaG = new double[rasterCols * rasterRows];
        var rasterSampleIndexes = new int[rasterCols * rasterRows];
        for (var rr = 0; rr < rasterRows; rr++)
        {
            for (var rc = 0; rc < rasterCols; rc++)
            {
                var col = Math.Min(rc * rasterStrideCol, grid.Cols - 1);
                var row = Math.Min(rr * rasterStrideRow, grid.Rows - 1);
                rasterSampleIndexes[rr * rasterCols + rc] = GetSampleIndex(grid.Index(col, row));
            }
        }

        // Índices distribuídos uniformemente no tempo. Guardamos snapshots da
        // mesma integração que produz PGA e dano, para que pause/avanço no
        // cliente seja uma reprodução determinística, não uma interpolação.
        var replayFrameCount = Math.Min(steps, Math.Max(2, options.MaxReplayFrames));
        var replayStepIndexes = Enumerable.Range(0, replayFrameCount)
            .Select(index => replayFrameCount == 1
                ? steps - 1
                : (int)Math.Round(index * (steps - 1.0) / (replayFrameCount - 1.0)))
            .ToHashSet();
        var replayFrames = new List<ReplayFrameArtifact>(replayStepIndexes.Count);

        // Uma única correção de distância por célula amostrada. Antes ela era
        // aplicada apenas ao raster: PGA/PGV e SDOF dos edifícios ficavam em
        // escala diferente da imagem de intensidade.
        var spreadingCorrection = new double[sampleCells.Count];
        for (var i = 0; i < sampleCells.Count; i++)
        {
            var cell = sampleCells[i];
            var col = cell % grid.Cols;
            var row = cell / grid.Cols;
            var horizontal = grid.DistanceMeters(col, row, parameters.EpicenterLon, parameters.EpicenterLat);
            var hypocentral = BruneSourceModel.HypocentralDistanceMeters(horizontal, depthMeters);
            spreadingCorrection[i] = BruneSourceModel.GeometricSpreadingCorrection(hypocentral);
        }

        run.AdvanceStage(SimulationStage.PropagatingField, 20,
            $"Propagating {steps} steps; {responseGroups.Count} unique structural responses for {buildings.Count} buildings.");
        await unitOfWork.SaveChangesAsync(ct);

        // Só guardamos histórico das células realmente consultadas. O solver
        // continua propagando a malha completa, mas não copiamos o campo inteiro
        // três vezes a cada passo para extrair aceleração.
        var samplePrev2 = new double[sampleCells.Count];
        var samplePrev1 = new double[sampleCells.Count];
        var sampleAcceleration = new double[sampleCells.Count];
        var peakGroundAccelMps2 = new double[sampleCells.Count];
        var velocityMps = new double[sampleCells.Count];
        var peakVelocityMps = new double[sampleCells.Count];
        var prevAccelerationMps2 = new double[sampleCells.Count];
        var dt2 = dt * dt;
        var progressInterval = Math.Max(1, steps / 10);

        for (var step = 0; step < steps; step++)
        {
            ct.ThrowIfCancellationRequested();
            var forcing = BruneSourceModel.SourceTimeFunction(step * dt, parameters.MomentMagnitude)
                          * options.SourceAmplitudeScale;
            wave.Step(sourceCol, sourceRow, forcing);
            var field = wave.Field;

            for (var i = 0; i < sampleCells.Count; i++)
            {
                var displacement = field[sampleCells[i]];
                var rawAcceleration = (displacement - 2.0 * samplePrev1[i] + samplePrev2[i]) / dt2;
                sampleAcceleration[i] = rawAcceleration * spreadingCorrection[i];
                samplePrev2[i] = samplePrev1[i];
                samplePrev1[i] = displacement;
            }

            foreach (var i in buildingSampleIndexes)
            {
                var accel = sampleAcceleration[i];
                var absAccel = Math.Abs(accel);
                if (absAccel > peakGroundAccelMps2[i]) peakGroundAccelMps2[i] = absAccel;

                if (step > 0) velocityMps[i] += 0.5 * (accel + prevAccelerationMps2[i]) * dt;
                var absVelocity = Math.Abs(velocityMps[i]);
                if (absVelocity > peakVelocityMps[i]) peakVelocityMps[i] = absVelocity;
                prevAccelerationMps2[i] = accel;
            }

            foreach (var group in responseGroups)
                group.Integrator.AddSample(sampleAcceleration[group.SampleIndex]);

            for (var i = 0; i < rasterSampleIndexes.Length; i++)
            {
                var pgaG = Math.Abs(sampleAcceleration[rasterSampleIndexes[i]]) / GravityMps2;
                if (pgaG > peakPgaG[i]) peakPgaG[i] = pgaG;
            }

            if (replayStepIndexes.Contains(step))
            {
                replayFrames.Add(CaptureReplayFrame(
                    replayFrames.Count,
                    step + 1,
                    (step + 1) * dt,
                    rasterCols,
                    rasterRows,
                    rasterSampleIndexes,
                    sampleAcceleration,
                    buildings,
                    buildingGroupIndex,
                    responseGroups));
            }

            if ((step + 1) % progressInterval == 0 && step + 1 < steps)
            {
                var progress = 20 + (int)Math.Floor((step + 1) / (double)steps * 60.0);
                run.AdvanceStage(SimulationStage.PropagatingField, progress,
                    $"Propagated {step + 1}/{steps} time steps.");
                await unitOfWork.SaveChangesAsync(ct);
            }
        }

        run.AdvanceStage(SimulationStage.PropagatingField, 80,
            $"Propagated {steps} steps ({steps * dt:0.0}s simulated).");
        await unitOfWork.SaveChangesAsync(ct);

        await WriteIntensityRasterAsync(run.Id, rasterCols, rasterRows, peakPgaG, ct);
        await WriteReplayAsync(
            run,
            grid,
            parameters,
            rasterCols,
            rasterRows,
            dt,
            steps,
            buildings.Count,
            replayFrames,
            ct);

        var responses = new List<BuildingSeismicResponse>(buildings.Count);
        for (var i = 0; i < buildings.Count; i++)
        {
            var building = buildings[i];
            var group = responseGroups[buildingGroupIndex[i]];
            var sdof = group.Integrator.Result;
            var peakDriftRatio = building.HeightMeters > 0
                ? sdof.PeakRelativeDisplacementMeters / building.HeightMeters
                : 0.0;

            responses.Add(new BuildingSeismicResponse
            {
                SimulationRunId = run.Id,
                BuildingId = building.Id,
                NaturalPeriodSeconds = group.NaturalPeriodSeconds,
                PeakGroundAccelerationG = peakGroundAccelMps2[group.SampleIndex] / GravityMps2,
                PeakGroundVelocityCms = peakVelocityMps[group.SampleIndex] * 100.0,
                SpectralAccelerationG = sdof.PeakAbsoluteAccelerationMps2 / GravityMps2,
                PeakDriftRatio = peakDriftRatio,
                DamageState = DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio),
            });
        }

        return responses;
    }

    private sealed record ResponseGroup(
        int SampleIndex,
        double NaturalPeriodSeconds,
        SdofOnlineIntegrator Integrator);

    private sealed record ReplayFrameArtifact(SeismicReplayFrameDto Metadata, byte[] Rgb);

    private ReplayFrameArtifact CaptureReplayFrame(
        int index,
        int step,
        double timeSeconds,
        int rasterCols,
        int rasterRows,
        IReadOnlyList<int> rasterSampleIndexes,
        IReadOnlyList<double> sampleAcceleration,
        IReadOnlyList<SimulationBuildingInput> buildings,
        IReadOnlyList<int> buildingGroupIndex,
        IReadOnlyList<ResponseGroup> responseGroups)
    {
        var rgb = new byte[rasterCols * rasterRows * 3];
        var peakAccelerationG = 0.0;
        for (var row = 0; row < rasterRows; row++)
        {
            // A malha nasce no sul e cresce para o norte; PNG cresce de cima
            // para baixo. A inversão mantém o quadro alinhado ao WGS84 no mapa.
            var imageRow = rasterRows - 1 - row;
            for (var col = 0; col < rasterCols; col++)
            {
                var sourceIndex = row * rasterCols + col;
                var accelerationG = Math.Abs(sampleAcceleration[rasterSampleIndexes[sourceIndex]]) / GravityMps2;
                peakAccelerationG = Math.Max(peakAccelerationG, accelerationG);
                var (red, green, blue) = WaveRasterColorizer.ColorizeAccelerationG(accelerationG);
                var targetIndex = (imageRow * rasterCols + col) * 3;
                rgb[targetIndex] = red;
                rgb[targetIndex + 1] = green;
                rgb[targetIndex + 2] = blue;
            }
        }

        var none = 0;
        var slight = 0;
        var moderate = 0;
        var extensive = 0;
        var complete = 0;
        var maxDriftRatio = 0.0;
        for (var i = 0; i < buildings.Count; i++)
        {
            var response = responseGroups[buildingGroupIndex[i]].Integrator.Result;
            var driftRatio = buildings[i].HeightMeters > 0
                ? response.PeakRelativeDisplacementMeters / buildings[i].HeightMeters
                : 0.0;
            maxDriftRatio = Math.Max(maxDriftRatio, driftRatio);
            switch (DamageStateClassifier.FromPeakDriftRatio(driftRatio))
            {
                case DamageState.None: none++; break;
                case DamageState.Slight: slight++; break;
                case DamageState.Moderate: moderate++; break;
                case DamageState.Extensive: extensive++; break;
                case DamageState.Complete: complete++; break;
            }
        }

        return new ReplayFrameArtifact(
            new SeismicReplayFrameDto(
                index,
                step,
                timeSeconds,
                peakAccelerationG,
                maxDriftRatio,
                none,
                slight,
                moderate,
                extensive,
                complete),
            rgb);
    }

    private async Task WriteReplayAsync(
        SimulationRun run,
        SeismicGrid grid,
        EarthquakeParameters parameters,
        int rasterCols,
        int rasterRows,
        double dt,
        int steps,
        int buildingCount,
        IReadOnlyList<ReplayFrameArtifact> frames,
        CancellationToken ct)
    {
        foreach (var frame in frames)
        {
            var png = rasterEncoder.EncodeRgbPng(rasterCols, rasterRows, frame.Rgb);
            await objectStorage.PutAsync(
                $"simulations/{run.Id}/replay/{frame.Metadata.Index:D4}.png",
                png,
                "image/png",
                ct);
        }

        var manifest = new SeismicReplayManifestDto(
            "fdtd-sh-2d/newmark-beta-1",
            grid.Cols,
            grid.Rows,
            rasterCols,
            rasterRows,
            grid.SpacingMeters,
            dt,
            steps,
            steps * dt,
            buildingCount,
            parameters.EpicenterLon,
            parameters.EpicenterLat,
            parameters.DepthKm,
            parameters.MomentMagnitude,
            run.IntensityWest ?? grid.OriginLon,
            run.IntensitySouth ?? grid.OriginLat,
            run.IntensityEast ?? grid.CellToLonLat(grid.Cols - 1, grid.Rows - 1).Lon,
            run.IntensityNorth ?? grid.CellToLonLat(grid.Cols - 1, grid.Rows - 1).Lat,
            frames.Select(frame => frame.Metadata).ToList());
        await objectStorage.PutAsync(
            $"simulations/{run.Id}/replay.json",
            JsonSerializer.SerializeToUtf8Bytes(manifest, JsonOptions),
            "application/json",
            ct);
    }

    private async Task WriteIntensityRasterAsync(
        Guid runId, int cols, int rows, double[] peakPgaG, CancellationToken ct)
    {
        var rgb = new byte[cols * rows * 3];
        for (var row = 0; row < rows; row++)
        {
            var imageRow = rows - 1 - row;
            for (var col = 0; col < cols; col++)
            {
                var sourceIndex = row * cols + col;
                var targetIndex = (imageRow * cols + col) * 3;
                var (red, green) = IntensityRasterEncoding.EncodePgaG(peakPgaG[sourceIndex]);
                rgb[targetIndex] = red;
                rgb[targetIndex + 1] = green;
                rgb[targetIndex + 2] = 0;
            }
        }

        var png = rasterEncoder.EncodeRgbPng(cols, rows, rgb);
        await objectStorage.PutAsync($"simulations/{runId}/intensity.png", png, "image/png", ct);
    }

    private BoundingBox ComputeDomain(
        IReadOnlyList<SimulationBuildingInput> buildings,
        EarthquakeParameters parameters)
    {
        double buildingsWest, buildingsSouth, buildingsEast, buildingsNorth;
        if (buildings.Count > 0)
        {
            buildingsWest = buildings.Min(b => b.Longitude);
            buildingsEast = buildings.Max(b => b.Longitude);
            buildingsSouth = buildings.Min(b => b.Latitude);
            buildingsNorth = buildings.Max(b => b.Latitude);
        }
        else
        {
            buildingsWest = buildingsEast = parameters.EpicenterLon;
            buildingsSouth = buildingsNorth = parameters.EpicenterLat;
        }

        var west = Math.Min(buildingsWest, parameters.EpicenterLon);
        var east = Math.Max(buildingsEast, parameters.EpicenterLon);
        var south = Math.Min(buildingsSouth, parameters.EpicenterLat);
        var north = Math.Max(buildingsNorth, parameters.EpicenterLat);

        // Um epicentro distante NÃO deve esticar o domínio simulado: SeismicGrid
        // só é uma aproximação válida para ~10-20km. Se incluir o epicentro
        // estourar o teto, volta a usar só a extensão dos edifícios — a fonte
        // ainda é injetada na borda mais próxima do epicentro real (LonLatToCell
        // clampa) e a correção de distância usa a posição real, não a clampada.
        if (DiagonalKm(west, south, east, north) > options.MaxDomainDiagonalKm)
        {
            west = buildingsWest;
            east = buildingsEast;
            south = buildingsSouth;
            north = buildingsNorth;
        }

        var midLatRad = (south + north) / 2.0 * Math.PI / 180.0;
        var metersPerDegreeLat = EarthRadiusMeters * Math.PI / 180.0;
        var metersPerDegreeLon = metersPerDegreeLat * Math.Cos(midLatRad);
        var marginDegLat = options.DomainMarginKm * 1000.0 / metersPerDegreeLat;
        var marginDegLon = options.DomainMarginKm * 1000.0 / Math.Max(metersPerDegreeLon, 1.0);

        return new BoundingBox(
            Math.Max(west - marginDegLon, -180.0),
            Math.Max(south - marginDegLat, -90.0),
            Math.Min(east + marginDegLon, 180.0),
            Math.Min(north + marginDegLat, 90.0));
    }

    private double DiagonalKm(double west, double south, double east, double north)
    {
        var midLatRad = (south + north) / 2.0 * Math.PI / 180.0;
        var metersPerDegreeLat = EarthRadiusMeters * Math.PI / 180.0;
        var metersPerDegreeLon = metersPerDegreeLat * Math.Cos(midLatRad);
        var widthMeters = (east - west) * metersPerDegreeLon;
        var heightMeters = (north - south) * metersPerDegreeLat;
        return Math.Sqrt(widthMeters * widthMeters + heightMeters * heightMeters) / 1000.0;
    }

    private double ChooseSpacing(BoundingBox area)
    {
        var midLatRad = area.Center.Lat * Math.PI / 180.0;
        var metersPerDegreeLat = EarthRadiusMeters * Math.PI / 180.0;
        var metersPerDegreeLon = metersPerDegreeLat * Math.Cos(midLatRad);
        var widthMeters = (area.East - area.West) * metersPerDegreeLon;
        var heightMeters = (area.North - area.South) * metersPerDegreeLat;

        var spacing = options.MinSpacingMeters;
        var estimatedCells = Math.Ceiling(widthMeters / spacing) * Math.Ceiling(heightMeters / spacing);
        if (estimatedCells > options.MaxGridCells)
            spacing *= Math.Sqrt(estimatedCells / options.MaxGridCells);

        return spacing;
    }
}

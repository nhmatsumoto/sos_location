using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Options;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Features;
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

        var buildings = await features.ListBuildingsAsync(run.CityRevisionId, ct);

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
        IReadOnlyList<Building> buildings, CancellationToken ct)
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

        // Estado por edifício mantido em O(1) por passo (não O(steps)): o
        // integrador SDOF e os picos de PGA/PGV só dependem da amostra atual e
        // da anterior, nunca do acelerograma inteiro — evita alocar
        // buildings.Count × steps doubles (poderia chegar a dezenas de GB numa
        // revisão com centenas de milhares de edifícios).
        var buildingCellIndex = new int[buildings.Count];
        var sdofIntegrators = new SdofOnlineIntegrator[buildings.Count];
        var naturalPeriods = new double[buildings.Count];
        var peakGroundAccelMps2 = new double[buildings.Count];
        var velocityMps = new double[buildings.Count];
        var peakVelocityMps = new double[buildings.Count];
        var prevBuildingAccelMps2 = new double[buildings.Count];
        for (var i = 0; i < buildings.Count; i++)
        {
            var (col, row) = grid.LonLatToCell(buildings[i].Centroid.X, buildings[i].Centroid.Y);
            buildingCellIndex[i] = grid.Index(col, row);
            naturalPeriods[i] = SdofResponseSolver.EstimatePeriodSeconds(buildings[i].HeightMeters);
            sdofIntegrators[i] = new SdofOnlineIntegrator(dt, naturalPeriods[i], options.DampingRatio);
        }

        var rasterStrideCol = Math.Max(1, grid.Cols / MaxRasterDimension);
        var rasterStrideRow = Math.Max(1, grid.Rows / MaxRasterDimension);
        var rasterCols = (grid.Cols + rasterStrideCol - 1) / rasterStrideCol;
        var rasterRows = (grid.Rows + rasterStrideRow - 1) / rasterStrideRow;
        var peakPgaG = new double[rasterCols * rasterRows];
        var rasterHypocentralDistance = new double[rasterCols * rasterRows];
        for (var rr = 0; rr < rasterRows; rr++)
        {
            for (var rc = 0; rc < rasterCols; rc++)
            {
                var col = Math.Min(rc * rasterStrideCol, grid.Cols - 1);
                var row = Math.Min(rr * rasterStrideRow, grid.Rows - 1);
                var horizontal = grid.DistanceMeters(col, row, parameters.EpicenterLon, parameters.EpicenterLat);
                rasterHypocentralDistance[rr * rasterCols + rc] =
                    BruneSourceModel.HypocentralDistanceMeters(horizontal, depthMeters);
            }
        }

        run.AdvanceStage(SimulationStage.PropagatingField, 20,
            $"Propagating wave field over {steps} steps ({totalSeconds:0.0}s simulated).");
        await unitOfWork.SaveChangesAsync(ct);

        var cellCount = grid.CellCount;
        var prev2 = new double[cellCount]; // t = -dt (fictício, zero — condição inicial implícita do FDTD)
        var prev1 = new double[cellCount]; // t = 0
        var current = new double[cellCount];
        var dt2 = dt * dt;

        for (var step = 0; step < steps; step++)
        {
            ct.ThrowIfCancellationRequested();
            var forcing = BruneSourceModel.SourceTimeFunction(step * dt, parameters.MomentMagnitude)
                          * options.SourceAmplitudeScale;
            wave.Step(sourceCol, sourceRow, forcing);
            Array.Copy(wave.Field, current, cellCount);

            for (var i = 0; i < buildings.Count; i++)
            {
                var idx = buildingCellIndex[i];
                var accel = (current[idx] - 2.0 * prev1[idx] + prev2[idx]) / dt2;
                sdofIntegrators[i].AddSample(accel);

                var absAccel = Math.Abs(accel);
                if (absAccel > peakGroundAccelMps2[i]) peakGroundAccelMps2[i] = absAccel;

                if (step > 0) velocityMps[i] += 0.5 * (accel + prevBuildingAccelMps2[i]) * dt;
                var absVelocity = Math.Abs(velocityMps[i]);
                if (absVelocity > peakVelocityMps[i]) peakVelocityMps[i] = absVelocity;
                prevBuildingAccelMps2[i] = accel;
            }

            for (var rr = 0; rr < rasterRows; rr++)
            {
                for (var rc = 0; rc < rasterCols; rc++)
                {
                    var col = Math.Min(rc * rasterStrideCol, grid.Cols - 1);
                    var row = Math.Min(rr * rasterStrideRow, grid.Rows - 1);
                    var idx = grid.Index(col, row);
                    var accel = (current[idx] - 2.0 * prev1[idx] + prev2[idx]) / dt2;

                    var rasterIdx = rr * rasterCols + rc;
                    var corrected = Math.Abs(accel)
                        * BruneSourceModel.GeometricSpreadingCorrection(rasterHypocentralDistance[rasterIdx]);
                    var pgaG = corrected / GravityMps2;
                    if (pgaG > peakPgaG[rasterIdx]) peakPgaG[rasterIdx] = pgaG;
                }
            }

            (prev2, prev1, current) = (prev1, current, prev2);
        }

        run.AdvanceStage(SimulationStage.PropagatingField, 80,
            $"Propagated {steps} steps ({steps * dt:0.0}s simulated).");
        await unitOfWork.SaveChangesAsync(ct);

        await WriteIntensityRasterAsync(run.Id, rasterCols, rasterRows, peakPgaG, ct);

        var responses = new List<BuildingSeismicResponse>(buildings.Count);
        for (var i = 0; i < buildings.Count; i++)
        {
            var building = buildings[i];
            var sdof = sdofIntegrators[i].Result;
            var peakDriftRatio = building.HeightMeters > 0
                ? sdof.PeakRelativeDisplacementMeters / building.HeightMeters
                : 0.0;

            responses.Add(new BuildingSeismicResponse
            {
                SimulationRunId = run.Id,
                BuildingId = building.Id,
                NaturalPeriodSeconds = naturalPeriods[i],
                PeakGroundAccelerationG = peakGroundAccelMps2[i] / GravityMps2,
                PeakGroundVelocityCms = peakVelocityMps[i] * 100.0,
                SpectralAccelerationG = sdof.PeakAbsoluteAccelerationMps2 / GravityMps2,
                PeakDriftRatio = peakDriftRatio,
                DamageState = DamageStateClassifier.FromPeakDriftRatio(peakDriftRatio),
            });
        }

        return responses;
    }

    private async Task WriteIntensityRasterAsync(
        Guid runId, int cols, int rows, double[] peakPgaG, CancellationToken ct)
    {
        var rgb = new byte[cols * rows * 3];
        for (var i = 0; i < cols * rows; i++)
        {
            var (r, g) = IntensityRasterEncoding.EncodePgaG(peakPgaG[i]);
            rgb[i * 3] = r;
            rgb[i * 3 + 1] = g;
            rgb[i * 3 + 2] = 0;
        }

        var png = rasterEncoder.EncodeRgbPng(cols, rows, rgb);
        await objectStorage.PutAsync($"simulations/{runId}/intensity.png", png, "image/png", ct);
    }

    private BoundingBox ComputeDomain(IReadOnlyList<Building> buildings, EarthquakeParameters parameters)
    {
        double buildingsWest, buildingsSouth, buildingsEast, buildingsNorth;
        if (buildings.Count > 0)
        {
            buildingsWest = buildings.Min(b => b.Centroid.X);
            buildingsEast = buildings.Max(b => b.Centroid.X);
            buildingsSouth = buildings.Min(b => b.Centroid.Y);
            buildingsNorth = buildings.Max(b => b.Centroid.Y);
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

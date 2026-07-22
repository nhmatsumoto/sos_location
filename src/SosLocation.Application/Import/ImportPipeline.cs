using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SosLocation.Application.Abstractions;
using SosLocation.Application.Normalization;
using SosLocation.Application.Options;
using SosLocation.Application.Profiles;
using SosLocation.Domain.Catalog;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Features;
using SosLocation.Domain.Jobs;
using SosLocation.Domain.Reconstruction;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Application.Import;

/// <summary>
/// Orquestra os estágios de importação de uma cidade. Cada execução é idempotente:
/// uma repetição não duplica edifícios nem publica duas revisões iguais — cada tentativa
/// opera sobre a revisão draft associada ao job, limpando features antes de reinserir.
/// </summary>
public sealed class ImportPipeline(
    ICityStore cities,
    IRevisionStore revisions,
    IDatasetStore datasets,
    IImportJobStore jobs,
    IFeatureWriter featureWriter,
    IFeatureReader featureReader,
    IUnitOfWork unitOfWork,
    IGeocoder geocoder,
    IOsmSource osmSource,
    IFixtureSource fixtureSource,
    IElevationProvider elevationProvider,
    IObjectStorage objectStorage,
    IEnumerable<ICityDataNormalizer> normalizers,
    ReconstructionProfileRegistry profiles,
    ImportLimits limits,
    ILogger<ImportPipeline> logger)
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private static readonly GeometryFactory Wgs84Factory =
        NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(4326);

    public async Task ExecuteAsync(ImportJob job, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<ImportRequest>(job.Request, JsonOptions)
                      ?? throw new InvalidOperationException("Job request payload is empty.");

        if (!profiles.TryGet(request.ReconstructionProfile, out var profile))
            throw new InvalidOperationException($"Unknown reconstruction profile '{request.ReconstructionProfile}'.");

        // Uma publicação pode ter sido persistida antes de uma falha tardia ao
        // concluir o job. Nesse caso, retomar significa apenas concluir o job;
        // revisões publicadas nunca voltam a ser reconstruídas.
        if (job.CityRevisionId is { } existingRevisionId)
        {
            var existingRevision = await revisions.FindByIdAsync(existingRevisionId, ct);
            if (existingRevision?.Status == CityRevisionStatus.Published)
            {
                job.Complete(DateTimeOffset.UtcNow);
                await unitOfWork.SaveChangesAsync(ct);
                return;
            }
        }

        // resolve-boundary
        job.AdvanceStage(ImportStage.ResolveBoundary, 5, "Resolving boundary");
        await unitOfWork.SaveChangesAsync(ct);
        var (city, area) = await ResolveBoundaryAsync(request, ct);
        job.CityId = city.Id;
        await unitOfWork.SaveChangesAsync(ct);

        // download-source
        job.AdvanceStage(ImportStage.DownloadSource, 20, $"Downloading from {request.Source}");
        await unitOfWork.SaveChangesAsync(ct);
        var payload = await DownloadAsync(request, area, ct);
        if (payload.Content.LongLength > limits.MaximumDownloadBytes)
            throw new InvalidOperationException(
                $"Downloaded payload ({payload.Content.LongLength} bytes) exceeds the maximum of {limits.MaximumDownloadBytes} bytes.");

        // persist-raw-data
        job.AdvanceStage(ImportStage.PersistRawData, 30, "Persisting raw data");
        await unitOfWork.SaveChangesAsync(ct);
        var datasetVersion = await PersistRawDataAsync(job, payload, ct);

        // validate
        job.AdvanceStage(ImportStage.Validate, 40, "Validating payload");
        await unitOfWork.SaveChangesAsync(ct);
        if (payload.Content.Length == 0)
            throw new InvalidOperationException("Source payload is empty.");

        // normalize
        job.AdvanceStage(ImportStage.Normalize, 55, "Normalizing features");
        await unitOfWork.SaveChangesAsync(ct);
        var normalizer = normalizers.FirstOrDefault(n => n.CanHandle(payload.Format))
                         ?? throw new InvalidOperationException($"No normalizer registered for format {payload.Format}.");
        var normalized = normalizer.Normalize(payload, new NormalizationLimits
        {
            MaximumFeatureCount = limits.MaximumFeatureCount,
            MaximumVerticesPerFeature = limits.MaximumVerticesPerFeature,
        });
        await jobs.ClearIssuesAsync(job.Id, ct);
        foreach (var issue in normalized.Issues)
        {
            await jobs.AddIssueAsync(new ProcessingIssue
            {
                JobId = job.Id,
                FeatureId = issue.FeatureId,
                Severity = issue.Severity,
                Code = issue.Code,
                Message = issue.Message,
            }, ct);
        }
        await unitOfWork.SaveChangesAsync(ct);

        // reconstruct
        job.AdvanceStage(ImportStage.Reconstruct, 75, "Reconstructing city");
        await unitOfWork.SaveChangesAsync(ct);
        var revision = await ReconstructAsync(job, city, area, normalized, profile, payload, datasetVersion, ct);

        // calculate-quality
        job.AdvanceStage(ImportStage.CalculateQuality, 85, "Calculating quality level");
        await unitOfWork.SaveChangesAsync(ct);
        revision.QualityLevel = await CalculateQualityAsync(revision.Id, ct);

        // publish-revision
        job.AdvanceStage(ImportStage.PublishRevision, 95, "Publishing revision");
        revision.MarkReady();
        revision.Publish(DateTimeOffset.UtcNow);
        await unitOfWork.SaveChangesAsync(ct);

        // invalidate-cache (hook para caches distribuídos; ETags derivam do revisionId imutável)
        job.AdvanceStage(ImportStage.InvalidateCache, 98, "Invalidating caches");
        await unitOfWork.SaveChangesAsync(ct);

        job.Complete(DateTimeOffset.UtcNow);
        await unitOfWork.SaveChangesAsync(ct);

        logger.LogInformation(
            "Import job {JobId} published revision {RevisionId} (#{RevisionNumber}) for city {CityName}",
            job.Id, revision.Id, revision.RevisionNumber, city.Name);
    }

    private async Task<(City City, BoundingBox Area)> ResolveBoundaryAsync(ImportRequest request, CancellationToken ct)
    {
        string name;
        string? countryCode = null;
        string? region = null;
        BoundingBox area;

        // A UI envia o bounding box devolvido pela busca. Ele é validado antes
        // do enqueue e evita repetir a consulta ao geocoder dentro do worker.
        if (request.BoundingBox is not null)
        {
            name = request.Name ?? request.DisplayName ?? "Custom Area";
            countryCode = request.CountryCode;
            region = request.Region;
            area = request.BoundingBox.ToDomain();
        }
        else if (request.PlaceProviderId is not null && request.Source == ImportSources.OpenStreetMap)
        {
            var place = await geocoder.ResolveAsync(request.PlaceProviderId, ct)
                        ?? throw new InvalidOperationException($"Place '{request.PlaceProviderId}' could not be resolved.");
            name = request.DisplayName ?? place.Name;
            countryCode = place.CountryCode;
            region = place.Region;
            area = place.BoundingBox;
        }
        else if (request.Source is ImportSources.Fixture or ImportSources.GeoJson)
        {
            name = request.Name ?? request.DisplayName ?? "Demo District";
            // A área efetiva virá das próprias features; usa-se um envelope provisório mínimo.
            area = request.BoundingBox?.ToDomain() ?? new BoundingBox(-0.01, -0.01, 0.01, 0.01);
        }
        else
        {
            throw new InvalidOperationException("Import request must provide a place or bounding box.");
        }

        if (area.AreaKm2 > limits.MaximumImportAreaKm2)
            throw new InvalidOperationException(
                $"Resolved area ({area.AreaKm2:0.0} km²) exceeds the maximum of {limits.MaximumImportAreaKm2} km².");

        var slug = City.BuildSlug(name, countryCode);
        var city = await cities.FindBySlugAsync(slug, ct);
        if (city is null)
        {
            city = new City { Name = name, CountryCode = countryCode, Region = region, Slug = slug };
            city.Boundary = BboxPolygon(area);
            var (lon, lat) = area.Center;
            city.Centroid = Wgs84Factory.CreatePoint(new Coordinate(lon, lat));
            await cities.AddAsync(city, ct);
            await unitOfWork.SaveChangesAsync(ct);
        }

        return (city, area);
    }

    private async Task<SourcePayload> DownloadAsync(ImportRequest request, BoundingBox area, CancellationToken ct)
        => request.Source switch
        {
            ImportSources.Fixture => await fixtureSource.LoadAsync(ct),
            ImportSources.OpenStreetMap => await osmSource.DownloadAreaAsync(area, ct),
            ImportSources.GeoJson => new SourcePayload
            {
                Content = System.Text.Encoding.UTF8.GetBytes(request.GeoJson
                    ?? throw new InvalidOperationException("GeoJSON payload missing.")),
                Format = SourcePayloadFormat.GeoJson,
                SourceName = "geojson-upload",
                ContentType = "application/geo+json",
            },
            _ => throw new InvalidOperationException($"Unsupported source '{request.Source}'."),
        };

    private async Task<DatasetVersion> PersistRawDataAsync(ImportJob job, SourcePayload payload, CancellationToken ct)
    {
        var checksum = Convert.ToHexStringLower(SHA256.HashData(payload.Content));
        var extension = payload.Format switch
        {
            SourcePayloadFormat.GeoJson => "geojson",
            SourcePayloadFormat.OverpassJson => "json",
            SourcePayloadFormat.OsmPbf => "osm.pbf",
            _ => "bin",
        };
        var dataset = await datasets.FindByNameAsync(payload.SourceName, ct);
        if (dataset is null)
        {
            dataset = payload.SourceName switch
            {
                "openstreetmap" => new Dataset
                {
                    Name = "openstreetmap",
                    Provider = "OpenStreetMap contributors",
                    DatasetType = "vector",
                    License = "ODbL-1.0",
                    Attribution = "© OpenStreetMap contributors",
                    LicenseUri = "https://www.openstreetmap.org/copyright",
                    SourceUri = payload.SourceUri,
                    SourceKey = UrbanDataSources.OpenStreetMap,
                    SourcePriority = UrbanDataSources.DefaultPriority(UrbanDataSources.OpenStreetMap),
                    IsStatistical = false,
                },
                _ => new Dataset
                {
                    Name = payload.SourceName,
                    Provider = payload.SourceName,
                    DatasetType = "vector",
                    License = "unknown",
                    Attribution = payload.SourceName,
                    SourceUri = payload.SourceUri,
                },
            };
            await datasets.AddAsync(dataset, ct);
            await unitOfWork.SaveChangesAsync(ct);
        }

        // Retentativas e reimportações do mesmo snapshot reutilizam a versão e
        // o objeto bruto já preservado, em vez de criar metadados duplicados.
        var existingVersion = await datasets.FindVersionByChecksumAsync(dataset.Id, checksum, ct);
        if (existingVersion is not null)
            return existingVersion;

        var storageKey = $"raw/{payload.SourceName}/{job.Id}/{checksum}.{extension}";
        if (!await objectStorage.ExistsAsync(storageKey, ct))
            await objectStorage.PutAsync(storageKey, payload.Content,
                payload.ContentType ?? "application/octet-stream", ct);

        var version = new DatasetVersion
        {
            DatasetId = dataset.Id,
            Version = checksum[..16],
            Checksum = checksum,
            StorageKey = storageKey,
            Metadata = JsonSerializer.Serialize(new { payload.SourceUri, payload.ContentType, bytes = payload.Content.LongLength }),
        };
        await datasets.AddVersionAsync(version, ct);
        await unitOfWork.SaveChangesAsync(ct);
        return version;
    }

    private async Task<CityRevision> ReconstructAsync(
        ImportJob job,
        City city,
        BoundingBox area,
        NormalizedCityData normalized,
        ReconstructionProfile profile,
        SourcePayload payload,
        DatasetVersion datasetVersion,
        CancellationToken ct)
    {
        CityRevision revision;
        if (job.CityRevisionId is { } revisionId)
        {
            revision = await revisions.FindByIdAsync(revisionId, ct)
                ?? throw new InvalidOperationException(
                    $"Revision '{revisionId}' associated with the job no longer exists.");
            if (revision.CityId != city.Id)
                throw new InvalidOperationException("The job revision belongs to a different city.");
            if (revision.Status is CityRevisionStatus.Published or CityRevisionStatus.Archived)
                throw new InvalidOperationException($"Revision '{revision.Id}' is immutable ({revision.Status}).");
        }
        else
        {
            revision = new CityRevision
            {
                CityId = city.Id,
                RevisionNumber = await revisions.NextRevisionNumberAsync(city.Id, ct),
                ReconstructionProfile = profile.Name,
            };
            await revisions.AddAsync(revision, ct);
            job.CityRevisionId = revision.Id;
        }

        revision.SourceSummary = JsonSerializer.Serialize(new
        {
            source = payload.SourceName,
            datasetVersionId = datasetVersion.Id,
            buildings = normalized.Buildings.Count,
            roads = normalized.Roads.Count,
            water = normalized.Water.Count,
            landUse = normalized.LandUse.Count,
            issues = normalized.Issues.Count,
        });
        revision.MarkProcessing();
        await unitOfWork.SaveChangesAsync(ct);

        // Reexecução idempotente: limpa qualquer resíduo antes de inserir.
        await featureWriter.DeleteRevisionFeaturesAsync(revision.Id, ct);

        // Elevação real do solo (DEM) por centroide; null → terreno plano estimado.
        var elevationPoints = normalized.Buildings
            .Select(nb => (nb.Footprint.Centroid.X, nb.Footprint.Centroid.Y))
            .ToList();
        var groundElevations = await elevationProvider.SampleAsync(elevationPoints, ct);
        var hasRealElevation = groundElevations is not null;
        if (!hasRealElevation && normalized.Buildings.Count > 0)
        {
            await jobs.AddIssueAsync(new ProcessingIssue
            {
                JobId = job.Id,
                Severity = IssueSeverity.Info,
                Code = "elevation-unavailable",
                Message = "DEM source unavailable; ground elevation kept flat (estimated).",
            }, ct);
        }

        var buildingIndex = 0;
        var buildings = new List<Building>(normalized.Buildings.Count);
        foreach (var nb in normalized.Buildings)
        {
            var heightResult = BuildingHeightCalculator.Calculate(new HeightInput(
                nb.ExplicitHeightMeters, nb.BuildingLevels, nb.RoofLevels, nb.BuildingType, null), profile);

            var footprint = nb.Footprint;
            footprint.SRID = 4326;
            var centroid = footprint.Centroid;
            centroid.SRID = 4326;

            buildings.Add(new Building
            {
                CityRevisionId = revision.Id,
                ExternalId = nb.ExternalId,
                Footprint = footprint,
                Centroid = centroid,
                HeightMeters = heightResult.HeightMeters,
                MinHeightMeters = nb.MinHeightMeters,
                GroundElevationMeters = groundElevations?[buildingIndex++] ?? 0,
                BuildingLevels = nb.BuildingLevels,
                RoofLevels = nb.RoofLevels,
                BuildingType = nb.BuildingType,
                RoofShape = nb.RoofShape,
                HeightSource = heightResult.Source,
                Confidence = heightResult.Confidence,
                SourceDatasetVersionId = datasetVersion.Id,
                Tags = SerializeTags(nb.Tags),
            });
        }

        var roads = normalized.Roads.Select(nr =>
        {
            nr.Geometry.SRID = 4326;
            return new Road
            {
                CityRevisionId = revision.Id,
                ExternalId = nr.ExternalId,
                Geometry = nr.Geometry,
                RoadClass = nr.RoadClass,
                Name = nr.Name,
                WidthMeters = nr.WidthMeters,
                Lanes = nr.Lanes,
                IsBridge = nr.IsBridge,
                IsTunnel = nr.IsTunnel,
                Confidence = DataConfidence.From(0.9),
                SourceDatasetVersionId = datasetVersion.Id,
                Tags = SerializeTags(nr.Tags),
            };
        }).ToList();

        var water = normalized.Water.Select(nw =>
        {
            nw.Geometry.SRID = 4326;
            return new WaterFeature
            {
                CityRevisionId = revision.Id,
                ExternalId = nw.ExternalId,
                Geometry = nw.Geometry,
                WaterType = nw.WaterType,
                Name = nw.Name,
                Confidence = DataConfidence.From(0.9),
                SourceDatasetVersionId = datasetVersion.Id,
                Tags = SerializeTags(nw.Tags),
            };
        }).ToList();

        var landUse = normalized.LandUse.Select(nl =>
        {
            nl.Geometry.SRID = 4326;
            return new LandUseArea
            {
                CityRevisionId = revision.Id,
                ExternalId = nl.ExternalId,
                Geometry = nl.Geometry,
                LandUseType = nl.LandUseType,
                Confidence = DataConfidence.From(0.8),
                SourceDatasetVersionId = datasetVersion.Id,
                Tags = SerializeTags(nl.Tags),
            };
        }).ToList();

        await featureWriter.BulkInsertBuildingsAsync(buildings, ct);
        await featureWriter.BulkInsertRoadsAsync(roads, ct);
        await featureWriter.BulkInsertWaterAsync(water, ct);
        await featureWriter.BulkInsertLandUseAsync(landUse, ct);

        // Tiles de relevo preservados no object storage → renderização offline.
        var prefetched = await elevationProvider.PrefetchTilesAsync(area, ct);
        if (prefetched > 0)
        {
            logger.LogInformation("Prefetched {Count} terrain tiles for offline rendering.", prefetched);
            await RegisterTerrainDatasetAsync(ct);
        }

        revision.SpatialCoverage = normalized.Boundary ?? BboxPolygon(area);
        revision.SpatialCoverage.SRID = 4326;

        // A cobertura real das features corrige cidades criadas com envelope provisório
        // (fixture/geojson sem bounding box explícita).
        if (normalized.Boundary is not null)
        {
            city.Boundary = normalized.Boundary;
            var coverageCentroid = normalized.Boundary.Centroid;
            coverageCentroid.SRID = 4326;
            city.Centroid = coverageCentroid;
            city.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await unitOfWork.SaveChangesAsync(ct);
        return revision;
    }

    private async Task<QualityLevel> CalculateQualityAsync(Guid revisionId, CancellationToken ct)
    {
        var (buildingCount, roadCount, _, _) = await featureReader.CountByRevisionAsync(revisionId, ct);
        if (buildingCount == 0)
            return roadCount > 0 ? QualityLevel.L1RoadsAndBasicFeatures : QualityLevel.L0BoundaryOnly;

        var observedRatio = await featureReader.ObservedHeightRatioAsync(revisionId, ct);
        return observedRatio >= 0.5
            ? QualityLevel.L3ObservedHeights
            : QualityLevel.L2FootprintsInferredHeights;
    }

    private async Task RegisterTerrainDatasetAsync(CancellationToken ct)
    {
        if (await datasets.FindByNameAsync("aws-terrain-tiles", ct) is not null) return;
        await datasets.AddAsync(new Dataset
        {
            Name = "aws-terrain-tiles",
            Provider = "AWS Open Data / Mapzen",
            DatasetType = "raster-dem",
            License = "Public domain (SRTM, NED, GMTED, ETOPO1)",
            Attribution = "Terrain Tiles © Mapzen, AWS Open Data; SRTM © NASA/USGS",
            LicenseUri = "https://registry.opendata.aws/terrain-tiles/",
            SourceUri = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium",
        }, ct);
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static string? SerializeTags(IReadOnlyDictionary<string, string> tags)
        => tags.Count == 0 ? null : JsonSerializer.Serialize(tags);

    private static Polygon BboxPolygon(BoundingBox b)
    {
        var polygon = Wgs84Factory.CreatePolygon(
        [
            new Coordinate(b.West, b.South),
            new Coordinate(b.East, b.South),
            new Coordinate(b.East, b.North),
            new Coordinate(b.West, b.North),
            new Coordinate(b.West, b.South),
        ]);
        return polygon;
    }
}

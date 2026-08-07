using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SosLocation.Domain.BuildingIntelligence;
using SosLocation.Domain.Catalog;
using SosLocation.Domain.Cities;
using SosLocation.Domain.Disasters;
using SosLocation.Domain.Features;
using SosLocation.Domain.Jobs;
using SosLocation.Domain.ValueObjects;

namespace SosLocation.Infrastructure.Persistence;

public partial class SosDbContext(DbContextOptions<SosDbContext> options) : DbContext(options)
{
    public DbSet<City> Cities => Set<City>();
    public DbSet<CityRevision> CityRevisions => Set<CityRevision>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<DatasetVersion> DatasetVersions => Set<DatasetVersion>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();
    public DbSet<ProcessingIssue> ProcessingIssues => Set<ProcessingIssue>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<Road> Roads => Set<Road>();
    public DbSet<WaterFeature> WaterFeatures => Set<WaterFeature>();
    public DbSet<LandUseArea> LandUseAreas => Set<LandUseArea>();
    public DbSet<SimulationRun> SimulationRuns => Set<SimulationRun>();
    public DbSet<BuildingSeismicResponse> BuildingSeismicResponses => Set<BuildingSeismicResponse>();
    public DbSet<RiskZone> RiskZones => Set<RiskZone>();
    public DbSet<DisasterScenario> DisasterScenarios => Set<DisasterScenario>();
    public DbSet<SourceObservation> SourceObservations => Set<SourceObservation>();
    public DbSet<ImpactObservation> ImpactObservations => Set<ImpactObservation>();
    public DbSet<OperationalMapFeature> OperationalMapFeatures => Set<OperationalMapFeature>();
    public DbSet<BuildingObservation> BuildingObservations => Set<BuildingObservation>();
    public DbSet<BuildingFootprintCandidate> BuildingFootprintCandidates => Set<BuildingFootprintCandidate>();
    public DbSet<BuildingFootprint> BuildingFootprints => Set<BuildingFootprint>();
    public DbSet<BuildingClassification> BuildingClassifications => Set<BuildingClassification>();
    public DbSet<BuildingReconciliation> BuildingReconciliations => Set<BuildingReconciliation>();
    public DbSet<BuildingValidation> BuildingValidations => Set<BuildingValidation>();
    public DbSet<ModelBundle> ModelBundles => Set<ModelBundle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.Entity<City>(entity =>
        {
            entity.ToTable("cities");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Name).HasMaxLength(256);
            entity.Property(c => c.CountryCode).HasMaxLength(8);
            entity.Property(c => c.Region).HasMaxLength(256);
            entity.Property(c => c.Slug).HasMaxLength(256);
            entity.HasIndex(c => c.Slug).IsUnique();
            entity.HasIndex(c => c.Boundary).HasMethod("gist");
        });

        modelBuilder.Entity<CityRevision>(entity =>
        {
            entity.ToTable("city_revisions");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.QualityLevel).HasConversion<string>().HasMaxLength(64);
            entity.Property(r => r.ReconstructionProfile).HasMaxLength(128);
            entity.Property(r => r.SourceSummary).HasColumnType("jsonb");
            entity.HasIndex(r => r.CityId);
            entity.HasIndex(r => r.Status);
            entity.HasIndex(r => new { r.CityId, r.RevisionNumber }).IsUnique();
            entity.HasIndex(r => r.SpatialCoverage).HasMethod("gist");
            entity.HasOne<City>().WithMany().HasForeignKey(r => r.CityId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Dataset>(entity =>
        {
            entity.ToTable("datasets");
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Name).HasMaxLength(256);
            entity.HasIndex(d => d.Name).IsUnique();
        });

        modelBuilder.Entity<DatasetVersion>(entity =>
        {
            entity.ToTable("dataset_versions");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Metadata).HasColumnType("jsonb");
            entity.HasIndex(v => v.DatasetId);
            entity.HasIndex(v => new { v.DatasetId, v.Checksum }).IsUnique();
            entity.HasOne<Dataset>().WithMany().HasForeignKey(v => v.DatasetId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ImportJob>(entity =>
        {
            entity.ToTable("import_jobs");
            entity.HasKey(j => j.Id);
            entity.Property(j => j.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(j => j.CurrentStage).HasConversion<string?>().HasMaxLength(64);
            entity.Property(j => j.JobType).HasMaxLength(64);
            entity.Property(j => j.Request).HasColumnType("jsonb");
            entity.HasIndex(j => j.Status);
            entity.HasIndex(j => j.CreatedAt);
            entity.HasIndex(j => new { j.Status, j.NextAttemptAt });
        });

        modelBuilder.Entity<ProcessingIssue>(entity =>
        {
            entity.ToTable("processing_issues");
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Severity).HasConversion<string>().HasMaxLength(16);
            entity.Property(i => i.Code).HasMaxLength(128);
            entity.HasIndex(i => i.JobId);
            entity.HasOne<ImportJob>().WithMany().HasForeignKey(i => i.JobId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Building>(entity =>
        {
            entity.ToTable("buildings");
            entity.HasKey(b => b.Id);
            entity.Property(b => b.ExternalId).HasMaxLength(256);
            entity.Property(b => b.BuildingType).HasMaxLength(64);
            entity.Property(b => b.RoofShape).HasMaxLength(64);
            entity.Property(b => b.HeightSource).HasConversion<string>().HasMaxLength(16);
            entity.Property(b => b.Confidence)
                .HasConversion(c => c.Value, v => DataConfidence.From(v));
            entity.Property(b => b.Tags).HasColumnType("jsonb");
            entity.Property(b => b.HeightMeters).HasColumnName("height_m");
            entity.Property(b => b.MinHeightMeters).HasColumnName("min_height_m");
            entity.Property(b => b.GroundElevationMeters).HasColumnName("ground_elevation_m");
            entity.Property(b => b.RoofHeightMeters).HasColumnName("roof_height_m");
            entity.HasIndex(b => b.CityRevisionId);
            entity.HasIndex(b => new { b.CityRevisionId, b.ExternalId }).IsUnique();
            entity.HasIndex(b => b.Footprint).HasMethod("gist");
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(b => b.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Road>(entity =>
        {
            entity.ToTable("roads");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.ExternalId).HasMaxLength(256);
            entity.Property(r => r.RoadClass).HasMaxLength(64);
            entity.Property(r => r.Name).HasMaxLength(512);
            entity.Property(r => r.Confidence)
                .HasConversion(c => c.Value, v => DataConfidence.From(v));
            entity.Property(r => r.Tags).HasColumnType("jsonb");
            entity.Property(r => r.WidthMeters).HasColumnName("width_m");
            entity.HasIndex(r => r.CityRevisionId);
            entity.HasIndex(r => new { r.CityRevisionId, r.ExternalId }).IsUnique();
            entity.HasIndex(r => r.Geometry).HasMethod("gist");
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(r => r.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WaterFeature>(entity =>
        {
            entity.ToTable("water_features");
            entity.HasKey(w => w.Id);
            entity.Property(w => w.ExternalId).HasMaxLength(256);
            entity.Property(w => w.WaterType).HasMaxLength(64);
            entity.Property(w => w.Name).HasMaxLength(512);
            entity.Property(w => w.Confidence)
                .HasConversion(c => c.Value, v => DataConfidence.From(v));
            entity.Property(w => w.Tags).HasColumnType("jsonb");
            entity.HasIndex(w => w.CityRevisionId);
            entity.HasIndex(w => new { w.CityRevisionId, w.ExternalId }).IsUnique();
            entity.HasIndex(w => w.Geometry).HasMethod("gist");
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(w => w.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LandUseArea>(entity =>
        {
            entity.ToTable("land_use_areas");
            entity.HasKey(l => l.Id);
            entity.Property(l => l.ExternalId).HasMaxLength(256);
            entity.Property(l => l.LandUseType).HasMaxLength(64);
            entity.Property(l => l.Confidence)
                .HasConversion(c => c.Value, v => DataConfidence.From(v));
            entity.Property(l => l.Tags).HasColumnType("jsonb");
            entity.HasIndex(l => l.CityRevisionId);
            entity.HasIndex(l => new { l.CityRevisionId, l.ExternalId }).IsUnique();
            entity.HasIndex(l => l.Geometry).HasMethod("gist");
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(l => l.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RiskZone>(entity =>
        {
            entity.ToTable("risk_zones");
            entity.HasKey(z => z.Id);
            entity.Property(z => z.Name).HasMaxLength(256);
            entity.Property(z => z.HazardType).HasConversion<string>().HasMaxLength(32);
            entity.Property(z => z.Level).HasConversion<string>().HasMaxLength(16);
            entity.Property(z => z.Notes).HasMaxLength(2048);
            entity.HasIndex(z => z.CityRevisionId);
            entity.HasIndex(z => z.Geometry).HasMethod("gist");
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(z => z.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DisasterScenario>(entity =>
        {
            entity.ToTable("disaster_scenarios");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.ScenarioKey).HasMaxLength(160);
            entity.Property(s => s.Name).HasMaxLength(512);
            entity.Property(s => s.HazardType).HasConversion<string>().HasMaxLength(32);
            entity.Property(s => s.CanonicalEventId).HasMaxLength(256);
            entity.Property(s => s.MagnitudeType).HasMaxLength(32);
            entity.HasIndex(s => s.ScenarioKey).IsUnique();
            entity.HasIndex(s => s.CanonicalEventId).IsUnique();
            entity.HasIndex(s => s.Epicenter).HasMethod("gist");
        });

        modelBuilder.Entity<SourceObservation>(entity =>
        {
            entity.ToTable("source_observations");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.SourceId).HasMaxLength(160);
            entity.Property(o => o.SourceUrl).HasMaxLength(2048);
            entity.Property(o => o.Kind).HasMaxLength(128);
            entity.Property(o => o.Payload).HasColumnType("jsonb");
            entity.Property(o => o.PayloadSha256).HasMaxLength(64);
            entity.Property(o => o.VerificationStatus).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(o => new { o.DisasterScenarioId, o.CapturedAt });
            entity.HasOne<DisasterScenario>().WithMany().HasForeignKey(o => o.DisasterScenarioId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ImpactObservation>(entity =>
        {
            entity.ToTable("impact_observations");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Kind).HasMaxLength(128);
            entity.Property(o => o.Subject).HasMaxLength(512);
            entity.Property(o => o.Value).HasColumnType("jsonb");
            entity.Property(o => o.VerificationStatus).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(o => new { o.DisasterScenarioId, o.ObservedAt });
            entity.HasOne<DisasterScenario>().WithMany().HasForeignKey(o => o.DisasterScenarioId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<SourceObservation>().WithMany().HasForeignKey(o => o.SourceObservationId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<ImpactObservation>().WithMany().HasForeignKey(o => o.PreviousObservationId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OperationalMapFeature>(entity =>
        {
            entity.ToTable("operational_map_features");
            entity.HasKey(f => f.Id);
            entity.Property(f => f.FeatureType).HasMaxLength(96);
            entity.Property(f => f.Name).HasMaxLength(512);
            entity.Property(f => f.Properties).HasColumnType("jsonb");
            entity.Property(f => f.VerificationStatus).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(f => new { f.DisasterScenarioId, f.FeatureType });
            entity.HasIndex(f => f.Geometry).HasMethod("gist");
            entity.HasOne<DisasterScenario>().WithMany().HasForeignKey(f => f.DisasterScenarioId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SimulationRun>(entity =>
        {
            entity.ToTable("simulation_runs");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.DisasterType).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.CurrentStage).HasConversion<string?>().HasMaxLength(64);
            entity.Property(r => r.Parameters).HasColumnType("jsonb");
            entity.HasIndex(r => r.Status);
            entity.HasIndex(r => r.CreatedAt);
            entity.HasIndex(r => r.CityRevisionId);
            entity.HasOne<CityRevision>().WithMany().HasForeignKey(r => r.CityRevisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BuildingSeismicResponse>(entity =>
        {
            entity.ToTable("building_seismic_responses");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.DamageState).HasConversion<string>().HasMaxLength(16);
            entity.HasIndex(r => r.SimulationRunId);
            entity.HasIndex(r => new { r.SimulationRunId, r.BuildingId }).IsUnique();
            entity.HasOne<SimulationRun>().WithMany().HasForeignKey(r => r.SimulationRunId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Building>().WithMany().HasForeignKey(r => r.BuildingId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BuildingObservation>(entity =>
        {
            entity.ToTable("building_observations");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.SourceType).HasMaxLength(64);
            entity.Property(o => o.SourceReference).HasMaxLength(512);
            entity.Property(o => o.RasterAssetUri).HasMaxLength(1024);
            entity.Property(o => o.MetadataJson).HasColumnType("jsonb");
            entity.HasIndex(o => o.DatasetId);
            entity.HasIndex(o => o.Geometry).HasMethod("gist");
            entity.HasOne<Dataset>().WithMany().HasForeignKey(o => o.DatasetId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BuildingFootprintCandidate>(entity =>
        {
            entity.ToTable("building_footprint_candidates");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.ModelName).HasMaxLength(128);
            entity.Property(c => c.ModelVersion).HasMaxLength(64);
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(c => c.Confidence)
                .HasConversion(v => v.Value, v => DataConfidence.From(v));
            entity.Property(c => c.Uncertainty)
                .HasConversion(
                    v => v.HasValue ? v.Value.Value : (double?)null,
                    v => v.HasValue ? DataConfidence.From(v.Value) : (DataConfidence?)null);
            entity.HasIndex(c => c.ObservationId);
            entity.HasIndex(c => c.Status);
            entity.HasIndex(c => c.Geometry).HasMethod("gist");
            entity.HasOne<BuildingObservation>().WithMany().HasForeignKey(c => c.ObservationId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BuildingFootprint>(entity =>
        {
            entity.ToTable("building_footprints");
            entity.HasKey(f => f.Id);
            entity.Property(f => f.SourceOfTruth).HasMaxLength(128);
            entity.Property(f => f.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(f => f.Revision).IsConcurrencyToken();
            entity.HasIndex(f => f.Status);
            entity.HasIndex(f => f.Geometry).HasMethod("gist");
        });

        modelBuilder.Entity<BuildingClassification>(entity =>
        {
            entity.ToTable("building_classifications");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.BuildingType).HasConversion<string>().HasMaxLength(32);
            entity.Property(c => c.ModelName).HasMaxLength(128);
            entity.Property(c => c.ModelVersion).HasMaxLength(64);
            entity.Property(c => c.Probability)
                .HasConversion(v => v.Value, v => DataConfidence.From(v));
            entity.HasIndex(c => c.BuildingId);
            entity.HasIndex(c => c.CandidateId);
            entity.HasOne<BuildingFootprint>().WithMany().HasForeignKey(c => c.BuildingId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BuildingFootprintCandidate>().WithMany().HasForeignKey(c => c.CandidateId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BuildingReconciliation>(entity =>
        {
            entity.ToTable("building_reconciliations");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.ChangeStatus).HasConversion<string>().HasMaxLength(32);
            entity.Property(r => r.Decision).HasMaxLength(64);
            entity.Property(r => r.IntersectionOverUnion)
                .HasConversion(v => v.Value, v => DataConfidence.From(v));
            entity.HasIndex(r => r.CandidateId);
            entity.HasIndex(r => r.ExistingBuildingId);
            entity.HasOne<BuildingFootprintCandidate>().WithMany().HasForeignKey(r => r.CandidateId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<BuildingFootprint>().WithMany().HasForeignKey(r => r.ExistingBuildingId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BuildingValidation>(entity =>
        {
            entity.ToTable("building_validations");
            entity.HasKey(v => v.Id);
            entity.Property(v => v.Decision).HasConversion<string>().HasMaxLength(32);
            entity.Property(v => v.CorrectedBuildingType).HasConversion<string?>().HasMaxLength(32);
            entity.Property(v => v.Reason).HasMaxLength(2048);
            entity.HasIndex(v => v.CandidateId);
            entity.HasIndex(v => v.ReviewerId);
            entity.HasIndex(v => v.CorrectedGeometry).HasMethod("gist");
            entity.HasOne<BuildingFootprintCandidate>().WithMany().HasForeignKey(v => v.CandidateId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ModelBundle>(entity =>
        {
            entity.ToTable("model_bundles");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Name).HasMaxLength(128);
            entity.Property(m => m.Version).HasMaxLength(64);
            entity.Property(m => m.Stage).HasConversion<string>().HasMaxLength(32);
            entity.Property(m => m.ArtifactUri).HasMaxLength(1024);
            entity.Property(m => m.ApprovedBy).HasMaxLength(256);
            entity.Property(m => m.MetricsJson).HasColumnType("jsonb");
            entity.Property(m => m.ConfigurationJson).HasColumnType("jsonb");
            entity.HasIndex(m => new { m.Name, m.Version }).IsUnique();
            entity.HasIndex(m => m.Stage);
            entity.HasOne<Dataset>().WithMany().HasForeignKey(m => m.TrainingDatasetId).OnDelete(DeleteBehavior.Restrict);
        });

        ApplySnakeCaseNames(modelBuilder);
    }

    /// <summary>Converte nomes de colunas PascalCase para snake_case, preservando nomes explícitos.</summary>
    private static void ApplySnakeCaseNames(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                var explicitName = property.GetColumnName();
                // Só converte quando o nome ainda é o padrão (igual ao nome CLR da propriedade).
                if (explicitName == property.Name)
                    property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    private static string ToSnakeCase(string name)
        => SnakeCaseBoundary().Replace(name, "$1_$2").ToLowerInvariant();

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex SnakeCaseBoundary();
}

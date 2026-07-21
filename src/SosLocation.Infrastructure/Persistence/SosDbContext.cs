using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
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

using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Common;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.News;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence
{
    public class SOSLocationDbContext : DbContext
    {
        public SOSLocationDbContext(DbContextOptions<SOSLocationDbContext> options)
            : base(options)
        {
            // Optimization: Disable change tracking by default for read-heavy operations if needed, 
            // but we'll stick to explicit AsNoTracking() where necessary.
        }

        private static readonly Func<SOSLocationDbContext, Guid, Task<Incident?>> _incidentByIdQuery =
            EF.CompileAsyncQuery((SOSLocationDbContext context, Guid id) =>
                context.Incidents.AsNoTracking().FirstOrDefault(i => i.Id == id));

        private static readonly Func<SOSLocationDbContext, Guid, Task<AttentionAlert?>> _alertByIdQuery =
            EF.CompileAsyncQuery((SOSLocationDbContext context, Guid id) =>
                context.AttentionAlerts.AsNoTracking().FirstOrDefault(a => a.Id == id));

        public Task<Incident?> GetIncidentByIdCompiledAsync(Guid id) => _incidentByIdQuery(this, id);
        public Task<AttentionAlert?> GetAlertByIdCompiledAsync(Guid id) => _alertByIdQuery(this, id);

        public DbSet<Incident> Incidents { get; set; } = null!;
        public DbSet<AttentionAlert> AttentionAlerts { get; set; } = null!;
        public DbSet<DisasterEvent> DisasterEvents { get; set; } = null!;
        public DbSet<RescueGroup> RescueGroups { get; set; } = null!;
        public DbSet<SupplyLogistics> SupplyLogistics { get; set; } = null!;
        public DbSet<SearchArea> SearchAreas { get; set; } = null!;
        public DbSet<Assignment> Assignments { get; set; } = null!;
        public DbSet<RescueTask> RescueTasks { get; set; } = null!;
        public DbSet<Campaign> Campaigns { get; set; } = null!;
        public DbSet<DonationMoney> Donations { get; set; } = null!;
        public DbSet<Expense> Expenses { get; set; } = null!;
        public DbSet<EdgeHub> Hubs { get; set; } = null!;
        public DbSet<PublicSnapshot> PublicSnapshots { get; set; } = null!;
        public DbSet<SimulationArea> SimulationAreas { get; set; } = null!;
        public DbSet<ScenarioBundle> ScenarioBundles { get; set; } = null!;
        public DbSet<SimulationRun> SimulationRuns { get; set; } = null!;
        public DbSet<CachedScene> CachedScenes { get; set; } = null!;
        public DbSet<Geolocation> Geolocations { get; set; } = null!;
        public DbSet<VisitedLocation> VisitedLocations { get; set; } = null!;
        public DbSet<FoundPeople> FoundPeople { get; set; } = null!;
        public DbSet<MissingPerson> MissingPersons { get; set; } = null!;
        public DbSet<CollapseReport> CollapseReports { get; set; } = null!;
        public DbSet<MapAnnotation> MapAnnotations { get; set; } = null!;
        public DbSet<NewsNotification> NewsNotifications { get; set; } = null!;
        public DbSet<DataSource> DataSources { get; set; } = null!;
        public DbSet<UserStats> UserStats { get; set; } = null!;
        public DbSet<Badge> Badges { get; set; } = null!;
        public DbSet<UserBadge> UserBadges { get; set; } = null!;
        public DbSet<DisasterType> DisasterTypes { get; set; } = null!;
        public DbSet<MeteorologicalData> MeteorologicalData { get; set; } = null!;
        public DbSet<RiskAnalysis> RiskAnalysis { get; set; } = null!;
        public DbSet<VolunteerTask> VolunteerTasks { get; set; } = null!;
        public DbSet<OperationalPoint> OperationalPoints { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SOSLocationDbContext).Assembly);

            modelBuilder.Entity<MissingPerson>().HasIndex(m => m.ExternalId).IsUnique();
            modelBuilder.Entity<MapAnnotation>().HasIndex(m => m.ExternalId).IsUnique();
            modelBuilder.Entity<CollapseReport>().HasIndex(c => c.ExternalId).IsUnique();
            modelBuilder.Entity<DisasterEvent>().HasIndex(d => new { d.Provider, d.ProviderEventId }).IsUnique();
            modelBuilder.Entity<DisasterType>().HasIndex(d => d.Code).IsUnique();
        }

        public override int SaveChanges()
        {
            UpdateTimestamps();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateTimestamps();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateTimestamps()
        {
            var now = DateTime.UtcNow;
            var addedEntries = ChangeTracker.Entries<BaseEntity>().Where(e => e.State == EntityState.Added);
            var modifiedEntries = ChangeTracker.Entries<BaseEntity>().Where(e => e.State == EntityState.Modified);

            foreach (var entry in addedEntries)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;

                if (entry.Entity is MapAnnotation mapAnn && string.IsNullOrEmpty(mapAnn.ExternalId))
                {
                    mapAnn.ExternalId = "INT-" + Guid.NewGuid().ToString("N").Substring(0, 12);
                }
                if (entry.Entity is MissingPerson mp && string.IsNullOrEmpty(mp.ExternalId))
                {
                    mp.ExternalId = "MP-" + Guid.NewGuid().ToString("N").Substring(0, 12);
                }
                if (entry.Entity is CollapseReport cr && string.IsNullOrEmpty(cr.ExternalId))
                {
                    cr.ExternalId = "CR-" + Guid.NewGuid().ToString("N").Substring(0, 12);
                }
                if (entry.Entity is AttentionAlert aa && string.IsNullOrEmpty(aa.ExternalId))
                {
                    aa.ExternalId = "AL-" + Guid.NewGuid().ToString("N").Substring(0, 12);
                }
            }

            foreach (var entry in modifiedEntries)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}

using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Shared;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Missions;
using SOSLocation.Domain.News;
using SOSLocation.Domain.Tracking;
using System;
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
        }

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
        public DbSet<Geolocation> Geolocations { get; set; } = null!;
        public DbSet<VisitedLocation> VisitedLocations { get; set; } = null!;
        public DbSet<FoundPeople> FoundPeople { get; set; } = null!;
        public DbSet<MissingPerson> MissingPersons { get; set; } = null!;
        public DbSet<CollapseReport> CollapseReports { get; set; } = null!;
        public DbSet<MapAnnotation> MapAnnotations { get; set; } = null!;
        public DbSet<NewsNotification> NewsNotifications { get; set; } = null!;
        public DbSet<SOSLocation.Domain.Operations.MapDemarcation> MapDemarcations { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SOSLocationDbContext).Assembly);

            modelBuilder.Entity<MissingPerson>().HasIndex(m => m.ExternalId).IsUnique();
            modelBuilder.Entity<MapAnnotation>().HasIndex(m => m.ExternalId).IsUnique();
            modelBuilder.Entity<CollapseReport>().HasIndex(c => c.ExternalId).IsUnique();
            modelBuilder.Entity<DisasterEvent>().HasIndex(d => new { d.Provider, d.ProviderEventId }).IsUnique();
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
            var entries = ChangeTracker
                .Entries()
                .Where(e => e.Entity is BaseEntity && (e.State == EntityState.Added || e.State == EntityState.Modified));

            foreach (var entityEntry in entries)
            {
                ((BaseEntity)entityEntry.Entity).UpdatedAt = DateTime.UtcNow;

                if (entityEntry.State == EntityState.Added)
                {
                    ((BaseEntity)entityEntry.Entity).CreatedAt = DateTime.UtcNow;
                }
            }
        }
    }
}

using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class DisasterEvent : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(20)]
        public string Provider { get; set; } = string.Empty;

        [MaxLength(120)]
        public string ProviderEventId { get; set; } = string.Empty;

        [MaxLength(20)]
        public string EventType { get; set; } = "Other";

        public int Severity { get; set; } = 1;

        [MaxLength(255)]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public DateTime StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public DateTime? ProviderUpdatedAt { get; set; }

        public double Lat { get; set; }
        public double Lon { get; set; }

        [MaxLength(2)]
        public string CountryCode { get; set; } = string.Empty;

        [MaxLength(120)]
        public string CountryName { get; set; } = string.Empty;

        public string GeometryJson { get; set; } = "{}";

        [MaxLength(500)]
        public string SourceUrl { get; set; } = string.Empty;

        public string RawPayloadJson { get; set; } = "{}";

        public DateTime IngestedAt { get; set; } = DateTime.UtcNow;
    }
}

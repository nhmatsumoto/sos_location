using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class MapAnnotation : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(24)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(20)]
        public string RecordType { get; set; } = string.Empty; // support_point, risk_area, etc.

        [MaxLength(180)]
        public string Title { get; set; } = string.Empty;

        public double Lat { get; set; }
        public double Lng { get; set; }

        [MaxLength(20)]
        public string Severity { get; set; } = string.Empty;

        public int? RadiusMeters { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "active";

        public string MetadataJson { get; set; } = "{}";
    }
}

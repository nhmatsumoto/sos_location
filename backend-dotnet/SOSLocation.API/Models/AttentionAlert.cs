using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class AttentionAlert : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(20)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(160)]
        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Severity { get; set; } = "medium";

        public double Lat { get; set; }
        public double Lng { get; set; }
        public int RadiusMeters { get; set; } = 500;

        public int? IncidentId { get; set; }
        public Incident? Incident { get; set; }
    }
}

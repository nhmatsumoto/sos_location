using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class MissingPerson : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(20)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(160)]
        public string PersonName { get; set; } = string.Empty;

        public int? Age { get; set; }

        [MaxLength(120)]
        public string City { get; set; } = string.Empty;

        [MaxLength(255)]
        public string LastSeenLocation { get; set; } = string.Empty;

        public double? Lat { get; set; }
        public double? Lng { get; set; }

        public string PhysicalDescription { get; set; } = string.Empty;
        public string AdditionalInfo { get; set; } = string.Empty;

        [MaxLength(160)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(40)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Source { get; set; } = "manual";

        public int? IncidentId { get; set; }
        public Incident? Incident { get; set; }
    }
}

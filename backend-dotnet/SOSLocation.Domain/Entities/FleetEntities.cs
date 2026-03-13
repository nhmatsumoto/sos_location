using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class EdgeHub : BaseEntity
    {
        [MaxLength(64)]
        public string HubId { get; set; } = string.Empty;

        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(45)]
        public string LocalIp { get; set; } = string.Empty;

        public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

        [MaxLength(40)]
        public string Status { get; set; } = "online";

        public int? IncidentId { get; set; }
        public Incident? Incident { get; set; }
    }

    public class PublicSnapshot : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
        public string DataJson { get; set; } = "{}";

        [MaxLength(20)]
        public string Version { get; set; } = "v1";
    }
}

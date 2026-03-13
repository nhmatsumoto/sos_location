using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class SearchArea : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public Guid? ExternalId { get; set; }

        [MaxLength(180)]
        public string Name { get; set; } = string.Empty;

        public string GeometryJson { get; set; } = "{}";

        [MaxLength(20)]
        public string Status { get; set; } = "Pending";
    }

    public class Assignment : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public Guid? ExternalId { get; set; }

        public Guid SearchAreaId { get; set; }
        public SearchArea? SearchArea { get; set; }

        [MaxLength(128)]
        public string AssignedToUserId { get; set; } = string.Empty;

        [MaxLength(128)]
        public string AssignedToTeamId { get; set; } = string.Empty;

        [MaxLength(20)]
        public string Status { get; set; } = "Assigned";

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }

    public class RescueTask : BaseEntity
    {
        [MaxLength(180)]
        public string Title { get; set; } = string.Empty;

        public Guid? ExternalId { get; set; }

        [MaxLength(140)]
        public string Team { get; set; } = string.Empty;

        [MaxLength(180)]
        public string Location { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [MaxLength(10)]
        public string Priority { get; set; } = "media";

        [MaxLength(10)]
        public string Status { get; set; } = "aberto";
    }
}

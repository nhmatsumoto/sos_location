using System;
using SOSLocation.Domain.Common;

namespace SOSLocation.Domain.Entities
{
    public class VolunteerTask : BaseEntity
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
        public string Priority { get; set; } = "low"; // low, medium, high, critical
        public string Status { get; set; } = "available"; // available, assigned, completed
        public string Category { get; set; } = "logistics"; // rescue, delivery, first-aid, logistics
        public Guid? AssignedToUserId { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}

using System;
using System.Collections.Generic;

namespace SOSLocation.Domain.Operations
{
    public class MapDemarcation
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Type { get; set; } // e.g., "Food Storage", "Blocked Access", "Field Hospital"
        public List<string> Tags { get; set; } = new List<string>();
        public DateTime CreatedAtUtc { get; set; }
        public string CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
    }
}

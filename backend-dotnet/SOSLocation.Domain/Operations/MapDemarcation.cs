using System;
using System.Collections.Generic;

namespace SOSLocation.Domain.Operations
{
    public class MapDemarcation
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Type { get; set; } = string.Empty;
        public string TagsJson { get; set; } = "[]";
        public bool IsActive { get; set; } = true;
    }
}

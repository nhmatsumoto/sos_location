using SOSLocation.Domain.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class MapAnnotation : BaseEntity
    {
        [MaxLength(24)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(20)]
        public string RecordType { get; set; } = string.Empty;

        [MaxLength(180)]
        public string Title { get; set; } = string.Empty;

        public double Lat { get; set; }
        public double Lng { get; set; }

        [MaxLength(20)]
        public string Severity { get; set; } = "Low";

        public int? RadiusMeters { get; set; }

        [MaxLength(30)]
        public string Status { get; set; } = "Active";

        public string MetadataJson { get; set; } = "{}";
    }

    public class CollapseReport : BaseEntity
    {
        [MaxLength(40)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(160)]
        public string LocationName { get; set; } = string.Empty;

        public double Latitude { get; set; }
        public double Longitude { get; set; }

        public string Description { get; set; } = string.Empty;

        [MaxLength(160)]
        public string ReporterName { get; set; } = string.Empty;

        [MaxLength(40)]
        public string ReporterPhone { get; set; } = string.Empty;

        [MaxLength(255)]
        public string VideoFileName { get; set; } = string.Empty;

        [MaxLength(512)]
        public string StoredVideoPath { get; set; } = string.Empty;

        public long VideoSizeBytes { get; set; }

        [MaxLength(60)]
        public string ProcessingStatus { get; set; } = "Pending";

        [MaxLength(255)]
        public string SplatPipelineHint { get; set; } = string.Empty;
    }

    public class OperationalPoint : BaseEntity
    {
        [MaxLength(100)]
        public string Type { get; set; } = "Alert"; // "Alert", "Support", "Mark"
        
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        
        public bool IsApproved { get; set; } = false;
        
        [MaxLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";
        
        public string Metadata { get; set; } = "{}";
    }
}

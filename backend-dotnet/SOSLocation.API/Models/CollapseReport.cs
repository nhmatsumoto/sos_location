using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class CollapseReport : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

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
}

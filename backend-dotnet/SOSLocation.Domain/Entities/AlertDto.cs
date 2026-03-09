using System;

namespace SOSLocation.Domain.Entities
{
    public class AlertDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty; // e.g., "Critical", "Warning", "Info"
        public string Source { get; set; } = string.Empty; // e.g., "INMET", "Defesa Civil", "CEMADEN"
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public float? Lat { get; set; }
        public float? Lon { get; set; }
        public string SourceUrl { get; set; } = string.Empty;
        public long? AffectedPopulation { get; set; } // Enriched via IBGE
    }
}

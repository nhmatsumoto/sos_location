using System;

namespace SOSLocation.Domain.News
{
    public class NewsNotification
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public DateTime PublishedAt { get; set; }
        public string Category { get; set; } = "General"; // e.g., Disaster, Weather, Health
        public string? ExternalUrl { get; set; }
    }
}

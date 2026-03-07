namespace SOSLocation.Application.DTOs.Alerts
{
    public class AlertDto
    {
        public Guid Id { get; set; }
        public string ExternalId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public int RadiusMeters { get; set; }
        public int? IncidentId { get; set; }
    }
}

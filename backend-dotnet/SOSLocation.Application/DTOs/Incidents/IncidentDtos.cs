namespace SOSLocation.Application.DTOs.Incidents
{
    public class IncidentDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public DateTime StartsAt { get; set; }
        public DateTime? EndsAt { get; set; }
    }

    public class CreateIncidentDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public DateTime StartsAt { get; set; }
    }
}

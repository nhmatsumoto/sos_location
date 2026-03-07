using SOSLocation.Domain.Common;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class Geolocation : BaseEntity
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class VisitedLocation : BaseEntity
    {
        [MaxLength(100)]
        public string Reference { get; set; } = string.Empty;

        public Guid GeolocationId { get; set; }
        public Geolocation? Geolocation { get; set; }

        public DateTime? VisitationDate { get; set; }
        public int EncounterNumber { get; set; }
        public double Radius { get; set; } = 1;

        [MaxLength(2000)]
        public string Observations { get; set; } = string.Empty;
    }

    public class FoundPeople : BaseEntity
    {
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        public int? GeolocationId { get; set; }
        public Geolocation? Geolocation { get; set; }

        [MaxLength(2)]
        public string Gender { get; set; } = string.Empty; // M, F

        [MaxLength(10)]
        public string StatusCondition { get; set; } = string.Empty; // Alive, Dead
    }
}

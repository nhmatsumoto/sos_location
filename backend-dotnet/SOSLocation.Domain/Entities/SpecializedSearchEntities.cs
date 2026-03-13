using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Common;
using System;
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

    public class MissingPerson : BaseEntity
    {
        [MaxLength(20)]
        public string ExternalId { get; set; } = string.Empty;

        [MaxLength(160)]
        public string PersonName { get; set; } = string.Empty;

        public int? Age { get; set; }

        [MaxLength(120)]
        public string City { get; set; } = string.Empty;

        [MaxLength(255)]
        public string LastSeenLocation { get; set; } = string.Empty;

        public double? Lat { get; set; }
        public double? Lng { get; set; }

        public string PhysicalDescription { get; set; } = string.Empty;
        public string AdditionalInfo { get; set; } = string.Empty;

        [MaxLength(160)]
        public string ContactName { get; set; } = string.Empty;

        [MaxLength(40)]
        public string ContactPhone { get; set; } = string.Empty;

        [MaxLength(30)]
        public string Source { get; set; } = string.Empty;

        public Guid? IncidentId { get; set; }
        public Incident? Incident { get; set; }
    }
}

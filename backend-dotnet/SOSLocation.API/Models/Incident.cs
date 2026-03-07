using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.API.Models
{
    public class Incident : TimestampedEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [MaxLength(180)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(80)]
        public string Type { get; set; } = string.Empty;
        
        [MaxLength(20)]
        public string Status { get; set; } = "active";
        
        [MaxLength(120)]
        public string Country { get; set; } = string.Empty;
        
        [MaxLength(120)]
        public string Region { get; set; } = string.Empty;
        
        public DateTime StartsAt { get; set; }
        public DateTime? EndsAt { get; set; }

        public ICollection<AttentionAlert>? Alerts { get; set; }
    }
}

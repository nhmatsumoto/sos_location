using SOSLocation.Domain.Common;
using System;
using System.ComponentModel.DataAnnotations;

namespace SOSLocation.Domain.Entities
{
    public class Campaign : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public Guid? ExternalId { get; set; }

        [MaxLength(180)]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public double GoalAmount { get; set; }
        public double CurrentAmount { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class DonationMoney : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public Guid? ExternalId { get; set; }

        public int? CampaignId { get; set; }
        public Campaign? Campaign { get; set; }

        public double Amount { get; set; }

        [MaxLength(40)]
        public string DonorName { get; set; } = "Anonymous";

        [MaxLength(20)]
        public string Status { get; set; } = "Pending";
    }

    public class Expense : BaseEntity
    {
        public Guid IncidentId { get; set; }
        public Incident? Incident { get; set; }

        public Guid? ExternalId { get; set; }

        [MaxLength(180)]
        public string Description { get; set; } = string.Empty;

        public double Amount { get; set; }

        [MaxLength(40)]
        public string Category { get; set; } = "General";
    }
}

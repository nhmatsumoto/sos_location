using MediatR;
using SOSLocation.Domain.Entities;
using SOSLocation.Application.DTOs.Incidents;
using System;
using System.Collections.Generic;

namespace SOSLocation.Application.Features.Operations.Queries.GetSnapshot
{
    public record GetOperationsSnapshotQuery : IRequest<OperationsSnapshotDto>;

    public class OperationsSnapshotDto
    {
        public DateTime GeneratedAtUtc { get; set; }
        public OperationsKpis Kpis { get; set; } = new();
        public OperationsLayers Layers { get; set; } = new();
    }

    public class OperationsKpis
    {
        public int CriticalAlerts { get; set; }
        public int ActiveTeams { get; set; }
        public double Rain24hMm { get; set; }
        public int SuppliesInTransit { get; set; }
        public int RiskZones { get; set; }
    }

    public class OperationsLayers
    {
        public IEnumerable<SOSLocation.Application.DTOs.Alerts.AlertDto> AttentionAlerts { get; set; } = [];
        public IEnumerable<IncidentDto> Incidents { get; set; } = [];
        public IEnumerable<TimelineItemDto> Timeline { get; set; } = [];
    }

    public class TimelineItemDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime At { get; set; }
        public string Title { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lng { get; set; }
        public string? Source { get; set; }
        public string? SourceUrl { get; set; }
        public long? AffectedPopulation { get; set; }
    }
}

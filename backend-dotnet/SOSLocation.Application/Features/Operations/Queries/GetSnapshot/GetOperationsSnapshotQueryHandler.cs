using MediatR;
using SOSLocation.Application.DTOs.Alerts;
using SOSLocation.Application.DTOs.Incidents;
using SOSLocation.Domain.Interfaces;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Application.Features.Operations.Queries.GetSnapshot
{
    public class GetOperationsSnapshotQueryHandler : IRequestHandler<GetOperationsSnapshotQuery, OperationsSnapshotDto>
    {
        private readonly IIncidentRepository _incidentRepository;
        private readonly IAttentionAlertRepository _alertRepository;
        private readonly IRescueGroupRepository _rescueGroupRepository;
        private readonly ISupplyLogisticsRepository _supplyRepository;
        private readonly IAlertsService _alertsService;
        private readonly ISearchAreaRepository _riskAreaRepository;

        public GetOperationsSnapshotQueryHandler(
            IIncidentRepository incidentRepository,
            IAttentionAlertRepository alertRepository,
            IRescueGroupRepository rescueGroupRepository,
            ISupplyLogisticsRepository supplyRepository,
            IAlertsService alertsService,
            ISearchAreaRepository riskAreaRepository)
        {
            _incidentRepository = incidentRepository;
            _alertRepository = alertRepository;
            _rescueGroupRepository = rescueGroupRepository;
            _supplyRepository = supplyRepository;
            _alertsService = alertsService;
            _riskAreaRepository = riskAreaRepository;
        }

        public async Task<OperationsSnapshotDto> Handle(GetOperationsSnapshotQuery request, CancellationToken cancellationToken)
        {
            var incidents = await _incidentRepository.GetAllAsync();
            var alerts = await _alertRepository.GetAllAsync();

            var highAlertTask = _alertRepository.GetCountAsync("high");
            var criticalAlertTask = _alertRepository.GetCountAsync("critical");
            var activeTeamsTask = _rescueGroupRepository.GetCountByStatusAsync("pronto", "em_campo");
            var suppliesTask = _supplyRepository.GetCountByStatusAsync("em_transporte");
            var publicAlerts = _alertsService.GetActiveAlerts();

            await Task.WhenAll(highAlertTask, criticalAlertTask, activeTeamsTask, suppliesTask);

            var timeline = alerts.Select(a => new TimelineItemDto
            {
                Id = a.Id.ToString(),
                At = DateTime.UtcNow,
                Title = a.Title,
                EventType = "ALERTA_MANUAL",
                Severity = a.Severity,
                Lat = a.Lat,
                Lng = a.Lng,
                Source = "SISTEMA"
            }).ToList();

            timeline.AddRange(publicAlerts.Select(p => new TimelineItemDto
            {
                Id = p.Id,
                At = p.Timestamp,
                Title = p.Title,
                EventType = p.Source,
                Severity = p.Severity,
                Lat = p.Lat ?? 0,
                Lng = p.Lon ?? 0,
                Source = p.Source,
                SourceUrl = p.SourceUrl,
                AffectedPopulation = p.AffectedPopulation
            }));

            return new OperationsSnapshotDto
            {
                GeneratedAtUtc = DateTime.UtcNow,
                Kpis = new OperationsKpis
                {
                    CriticalAlerts = await highAlertTask + await criticalAlertTask + publicAlerts.Count(),
                    ActiveTeams = await activeTeamsTask,
                    SuppliesInTransit = await suppliesTask,
                    RiskZones = 0
                },
                Layers = new OperationsLayers
                {
                    Incidents = incidents.Select(i => new IncidentDto { Id = i.Id, Name = i.Name, Status = i.Status }),
                    AttentionAlerts = alerts.Select(a => new SOSLocation.Application.DTOs.Alerts.AlertDto
                    {
                        Id = a.Id,
                        Title = a.Title,
                        Severity = a.Severity,
                        Lat = a.Lat,
                        Lng = a.Lng
                    }),
                    Timeline = timeline.OrderByDescending(t => t.At)
                }
            };
        }
    }
}

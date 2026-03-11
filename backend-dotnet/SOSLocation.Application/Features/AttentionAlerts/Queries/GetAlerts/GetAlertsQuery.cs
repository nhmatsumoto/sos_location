using MediatR;
using SOSLocation.Application.DTOs.Alerts;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Incidents;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace SOSLocation.Application.Features.AttentionAlerts.Queries.GetAlerts
{
    public record GetAlertsQuery : IRequest<IEnumerable<SOSLocation.Application.DTOs.Alerts.AlertDto>>;

    public class GetAlertsQueryHandler : IRequestHandler<GetAlertsQuery, IEnumerable<SOSLocation.Application.DTOs.Alerts.AlertDto>>
    {
        private readonly IAttentionAlertRepository _repository;

        public GetAlertsQueryHandler(IAttentionAlertRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<SOSLocation.Application.DTOs.Alerts.AlertDto>> Handle(GetAlertsQuery request, CancellationToken cancellationToken)
        {
            var alerts = await _repository.GetAllAsync();
            return alerts.Select(a => new SOSLocation.Application.DTOs.Alerts.AlertDto
            {
                Id = a.Id,
                ExternalId = a.ExternalId,
                Title = a.Title,
                Message = a.Message,
                Severity = a.Severity,
                Lat = a.Lat,
                Lng = a.Lng,
                RadiusMeters = a.RadiusMeters,
                IncidentId = a.IncidentId
            });
        }
    }
}

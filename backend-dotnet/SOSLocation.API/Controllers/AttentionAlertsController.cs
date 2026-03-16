using MediatR;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Common;
using SOSLocation.Application.DTOs.Alerts;
using SOSLocation.Application.DTOs.Common;
using SOSLocation.Application.Features.AttentionAlerts.Queries.GetAlerts;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/integrations/alerts")]
    [AllowAnonymous]
    public class AttentionAlertsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public AttentionAlertsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<ActionResult<Result<ListResponseDto<AlertDto>>>> GetAll()
        {
            var query = new GetAlertsQuery();
            var result = (await _mediator.Send(query)).ToList();
            
            return Ok(Result<ListResponseDto<AlertDto>>.Success(new ListResponseDto<AlertDto>
            {
                Items = result,
                TotalCount = result.Count
            }));
        }
    }
}

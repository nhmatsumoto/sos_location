using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Operations;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [AllowAnonymous] // In a real app, this would be [Authorize(Roles = "Admin")]
    public class DemarcationsController : ControllerBase
    {
        private readonly IMapDemarcationRepository _repository;

        public DemarcationsController(IMapDemarcationRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MapDemarcation>>> List()
        {
            return Ok(await _repository.ListActiveAsync());
        }

        [HttpPost]
        public async Task<ActionResult<MapDemarcation>> Create(MapDemarcation demarcation)
        {
            demarcation.Id = Guid.NewGuid();
            demarcation.CreatedAtUtc = DateTime.UtcNow;
            await _repository.AddAsync(demarcation);
            return CreatedAtAction(nameof(List), new { id = demarcation.Id }, demarcation);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
            return NoContent();
        }
    }
}

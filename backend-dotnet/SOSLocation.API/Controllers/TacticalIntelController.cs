using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Entities;
using SOSLocation.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/tactical-intel")]
    [Authorize]
    public class TacticalIntelController : ControllerBase
    {
        private readonly SOSLocationDbContext _context;

        public TacticalIntelController(SOSLocationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<OperationalPoint>>> GetActivePoints()
        {
            // Returns only approved points to public/regular users, or all to admins
            bool canSeePending = User.Identity?.IsAuthenticated == true && (User.IsInRole("admin") || User.IsInRole("coordinator"));
            
            if (canSeePending)
            {
                return await _context.OperationalPoints.ToListAsync();
            }

            return await _context.OperationalPoints
                .Where(p => p.IsApproved)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<OperationalPoint>> Create(OperationalPoint point)
        {
            point.Id = Guid.NewGuid();
            point.IsApproved = User.IsInRole("admin") || User.IsInRole("coordinator");
            point.CreatedBy = User.Identity?.Name ?? "Anonymous";
            point.Status = point.IsApproved ? "Active" : "Pending";

            _context.OperationalPoints.Add(point);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetActivePoints), new { id = point.Id }, point);
        }

        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> Approve(Guid id)
        {
            var point = await _context.OperationalPoints.FindAsync(id);
            if (point == null) return NotFound();

            point.IsApproved = true;
            point.Status = "Active";
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin,coordinator")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var point = await _context.OperationalPoints.FindAsync(id);
            if (point == null) return NotFound();

            _context.OperationalPoints.Remove(point);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

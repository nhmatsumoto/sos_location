using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Entities;
using SOSLocation.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/volunteer")]
    [Authorize]
    public class VolunteerController : ControllerBase
    {
        private readonly SOSLocationDbContext _context;

        public VolunteerController(SOSLocationDbContext context)
        {
            _context = context;
        }

        [HttpGet("tasks")]
        public async Task<IActionResult> GetTasks()
        {
            var tasks = await _context.VolunteerTasks
                .Where(t => t.Status == "available")
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            // Seed some data if empty for demo/training purposes as requested by author
            if (!tasks.Any())
            {
                await SeedInitialTasks();
                tasks = await _context.VolunteerTasks
                    .Where(t => t.Status == "available")
                    .OrderByDescending(t => t.CreatedAt)
                    .ToListAsync();
            }

            return Ok(tasks);
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
            Guid userId = Guid.Parse(userIdStr);

            var activeTasks = await _context.VolunteerTasks.CountAsync(t => t.Status == "assigned" && t.AssignedToUserId == userId);
            var completedTasks = await _context.VolunteerTasks.CountAsync(t => t.Status == "completed" && t.AssignedToUserId == userId);
            
            // Impact score is a simple heuristic for now
            var impactScore = completedTasks * 100;

            return Ok(new
            {
                ActiveTasks = activeTasks,
                CompletedTasks = completedTasks,
                ImpactScore = impactScore,
                HoursContributed = completedTasks * 2 // Estimate 2h per task
            });
        }

        [HttpPost("tasks/{taskId}/assign")]
        public async Task<IActionResult> AssignTask(Guid taskId)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
            Guid userId = Guid.Parse(userIdStr);

            var task = await _context.VolunteerTasks.FindAsync(taskId);
            if (task == null) return NotFound();
            if (task.Status != "available") return BadRequest("Tarefa não está mais disponível.");

            task.Status = "assigned";
            task.AssignedToUserId = userId;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(task);
        }

        [HttpPost("tasks/{taskId}/complete")]
        public async Task<IActionResult> CompleteTask(Guid taskId)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

            var task = await _context.VolunteerTasks.FindAsync(taskId);
            if (task == null) return NotFound();
            
            task.Status = "completed";
            task.CompletedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(task);
        }

        private async Task SeedInitialTasks()
        {
            _context.VolunteerTasks.AddRange(new List<VolunteerTask>
            {
                new VolunteerTask {
                    Title = "Entrega de Mantimentos - Setor Norte",
                    Description = "Necessário entrega de kits de higiene e água potável para 15 famílias isoladas no bairro Vila Esperança.",
                    Latitude = -21.115, Longitude = -42.935, Address = "Vila Esperança",
                    Priority = "high", Status = "available", Category = "delivery"
                },
                new VolunteerTask {
                    Title = "Triagem de Doações - Centro de Apoio",
                    Description = "Auxílio na organização e separação de roupas e alimentos recebidos para distribuição imediata.",
                    Latitude = -21.125, Longitude = -42.945, Address = "Centro Comunitário",
                    Priority = "medium", Status = "available", Category = "logistics"
                },
                new VolunteerTask {
                    Title = "Apoio em Primeiro Socorros",
                    Description = "Profissional de saúde ou socorrista para apoio na base avançada Beta.",
                    Latitude = -21.110, Longitude = -42.940, Address = "Base Avançada Beta",
                    Priority = "critical", Status = "available", Category = "first-aid"
                }
            });
            await _context.SaveChangesAsync();
        }
    }
}

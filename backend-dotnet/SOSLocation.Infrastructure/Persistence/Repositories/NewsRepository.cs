using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.News;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class NewsRepository : INewsRepository
    {
        private readonly SOSLocationDbContext _context;

        public NewsRepository(SOSLocationDbContext context)
        {
            _context = context;
        }

        public async Task<NewsNotification?> GetByIdAsync(Guid id)
        {
            return await _context.NewsNotifications.FindAsync(id);
        }

        public async Task<IEnumerable<NewsNotification>> GetAllAsync(string? country = null, string? location = null, string? timeWindow = null)
        {
            IQueryable<NewsNotification> query = _context.NewsNotifications;

            if (!string.IsNullOrEmpty(country))
            {
                query = query.Where(n => n.Country.ToLower() == country.ToLower());
            }

            if (!string.IsNullOrEmpty(location))
            {
                query = query.Where(n => n.Location.ToLower().Contains(location.ToLower()));
            }

            if (!string.IsNullOrEmpty(timeWindow))
            {
                var now = DateTime.UtcNow;
                query = timeWindow.ToLower() switch
                {
                    "live" => query.Where(n => n.PublishedAt >= now.AddHours(-24)),
                    "week" => query.Where(n => n.PublishedAt >= now.AddDays(-7)),
                    "month" => query.Where(n => n.PublishedAt >= now.AddDays(-30)),
                    "year" => query.Where(n => n.PublishedAt >= now.AddDays(-365)),
                    _ => query
                };
            }

            return await query.OrderByDescending(n => n.PublishedAt).ToListAsync();
        }

        public async Task<bool> ExistsAsync(string title, DateTime publishedAt)
        {
            return await _context.NewsNotifications.AnyAsync(n => n.Title == title && n.PublishedAt == publishedAt);
        }

        public async Task AddAsync(NewsNotification news)
        {
            await _context.NewsNotifications.AddAsync(news);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteOldNewsAsync(DateTime olderThan)
        {
            var oldNews = _context.NewsNotifications.Where(n => n.PublishedAt < olderThan);
            _context.NewsNotifications.RemoveRange(oldNews);
            await _context.SaveChangesAsync();
        }
    }
}

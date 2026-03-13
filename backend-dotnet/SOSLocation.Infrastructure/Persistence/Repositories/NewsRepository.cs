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

        public async Task<IEnumerable<NewsNotification>> GetAllAsync(string? country = null, string? location = null)
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

            return await query.OrderByDescending(n => n.PublishedAt).ToListAsync();
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

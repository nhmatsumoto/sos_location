using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SOSLocation.Domain.News;

namespace SOSLocation.Domain.Interfaces
{
    public interface INewsRepository
    {
        Task<NewsNotification?> GetByIdAsync(Guid id);
        Task<IEnumerable<NewsNotification>> GetAllAsync(string? country = null, string? location = null);
        Task AddAsync(NewsNotification news);
        Task DeleteOldNewsAsync(DateTime olderThan);
    }
}

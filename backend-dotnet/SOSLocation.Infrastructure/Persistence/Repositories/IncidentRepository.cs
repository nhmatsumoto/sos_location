using Dapper;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class IncidentRepository : IIncidentRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public IncidentRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Incident>> GetAllAsync()
        {
            var query = "SELECT * FROM \"Incidents\" ORDER BY \"CreatedAt\" DESC";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<Incident>(query);
        }

        public IQueryable<Incident> GetQueryable()
        {
            return _efContext.Incidents.AsQueryable();
        }

        public async Task<Incident?> GetByIdAsync(Guid id)
        {
            var query = "SELECT * FROM \"Incidents\" WHERE \"Id\" = @Id";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<Incident>(query, new { Id = id });
        }

        public async Task AddAsync(Incident incident)
        {
            _efContext.Incidents.Add(incident);
            await _efContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(Incident incident)
        {
            _efContext.Incidents.Update(incident);
            await _efContext.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var incident = await _efContext.Incidents.FindAsync(id);
            if (incident != null)
            {
                _efContext.Incidents.Remove(incident);
                await _efContext.SaveChangesAsync();
            }
        }

        public async Task<int> GetCountAsync()
        {
            var query = "SELECT COUNT(*) FROM \"Incidents\"";
            using var connection = _dapperContext.CreateConnection();
            return await connection.ExecuteScalarAsync<int>(query);
        }
    }
}

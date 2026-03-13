using Dapper;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Threading;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class IncidentRepository : IIncidentRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string IncidentColumns = "\"Id\", \"Title\", \"Description\", \"Location\", \"Severity\", \"Status\", \"CreatedAt\", \"UpdatedAt\"";

        public IncidentRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Incident>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {IncidentColumns} FROM \"Incidents\" ORDER BY \"CreatedAt\" DESC";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<Incident>(command);
        }

        public IQueryable<Incident> GetQueryable()
        {
            return _efContext.Incidents.AsQueryable();
        }

        public async Task<Incident?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            // Use compiled EF query for single item lookup optimization
            return await _efContext.GetIncidentByIdCompiledAsync(id);
        }

        public async Task AddAsync(Incident incident, CancellationToken ct = default)
        {
            _efContext.Incidents.Add(incident);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task UpdateAsync(Incident incident, CancellationToken ct = default)
        {
            _efContext.Incidents.Update(incident);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var incident = await _efContext.Incidents.FindAsync(new object[] { id }, ct);
            if (incident != null)
            {
                _efContext.Incidents.Remove(incident);
                await _efContext.SaveChangesAsync(ct);
            }
        }

        public async Task<int> GetCountAsync(CancellationToken ct = default)
        {
            var query = "SELECT COUNT(*) FROM \"Incidents\"";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.ExecuteScalarAsync<int>(command);
        }
    }
}

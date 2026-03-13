using Dapper;
using SOSLocation.Domain.Missions;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;
using System.Threading;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class SearchAreaRepository : ISearchAreaRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string SearchAreaColumns = "\"Id\", \"IncidentId\", \"Title\", \"Description\", \"PolyJson\", \"Status\", \"CreatedAt\", \"UpdatedAt\"";

        public SearchAreaRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<SearchArea>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default)
        {
            var query = $"SELECT {SearchAreaColumns} FROM \"SearchAreas\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, new { IncidentId = incidentId }, cancellationToken: ct);
            return await connection.QueryAsync<SearchArea>(command);
        }

        public IQueryable<SearchArea> GetQueryable()
        {
            return _efContext.SearchAreas.AsQueryable();
        }

        public async Task AddAsync(SearchArea area, CancellationToken ct = default)
        {
            _efContext.SearchAreas.Add(area);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task UpdateAsync(SearchArea area, CancellationToken ct = default)
        {
            _efContext.SearchAreas.Update(area);
            await _efContext.SaveChangesAsync(ct);
        }
    }

    public class AssignmentRepository : IAssignmentRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string AssignmentColumns = "\"Id\", \"IncidentId\", \"ResourceId\", \"Title\", \"Details\", \"Status\", \"CreatedAt\", \"UpdatedAt\"";

        public AssignmentRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Assignment>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {AssignmentColumns} FROM \"Assignments\" ORDER BY \"CreatedAt\" DESC";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<Assignment>(command);
        }

        public async Task<IEnumerable<Assignment>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default)
        {
            var query = $"SELECT {AssignmentColumns} FROM \"Assignments\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, new { IncidentId = incidentId }, cancellationToken: ct);
            return await connection.QueryAsync<Assignment>(command);
        }

        public async Task AddAsync(Assignment assignment, CancellationToken ct = default)
        {
            _efContext.Assignments.Add(assignment);
            await _efContext.SaveChangesAsync(ct);
        }
    }
}

using Dapper;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class SearchAreaRepository : ISearchAreaRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public SearchAreaRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<SearchArea>> GetByIncidentIdAsync(Guid incidentId)
        {
            var query = "SELECT * FROM \"SearchAreas\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<SearchArea>(query, new { IncidentId = incidentId });
        }

        public async Task AddAsync(SearchArea area)
        {
            _efContext.SearchAreas.Add(area);
            await _efContext.SaveChangesAsync();
        }

        public async Task UpdateAsync(SearchArea area)
        {
            _efContext.SearchAreas.Update(area);
            await _efContext.SaveChangesAsync();
        }
    }

    public class AssignmentRepository : IAssignmentRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public AssignmentRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Assignment>> GetByIncidentIdAsync(Guid incidentId)
        {
            var query = "SELECT * FROM \"Assignments\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<Assignment>(query, new { IncidentId = incidentId });
        }

        public async Task AddAsync(Assignment assignment)
        {
            _efContext.Assignments.Add(assignment);
            await _efContext.SaveChangesAsync();
        }
    }
}

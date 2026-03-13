using Dapper;
using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Threading;
using System.Linq;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class AttentionAlertRepository : IAttentionAlertRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string AlertColumns = "\"Id\", \"ExternalId\", \"Title\", \"Message\", \"Severity\", \"Lat\", \"Lng\", \"CreatedAt\", \"UpdatedAt\"";

        public AttentionAlertRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<AttentionAlert>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {AlertColumns} FROM \"AttentionAlerts\" ORDER BY \"CreatedAt\" DESC";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<AttentionAlert>(command);
        }

        public async Task<AttentionAlert?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            // Use compiled EF query for single item lookup optimization
            return await _efContext.GetAlertByIdCompiledAsync(id);
        }

        public async Task AddAsync(AttentionAlert alert, CancellationToken ct = default)
        {
            _efContext.AttentionAlerts.Add(alert);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task<int> GetCountAsync(string? severity = null, CancellationToken ct = default)
        {
            var query = "SELECT COUNT(*) FROM \"AttentionAlerts\"";
            object parameters = new { };

            if (!string.IsNullOrEmpty(severity))
            {
                query += " WHERE \"Severity\" = @Severity";
                parameters = new { Severity = severity };
            }

            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, parameters, cancellationToken: ct);
            return await connection.ExecuteScalarAsync<int>(command);
        }
    }
}

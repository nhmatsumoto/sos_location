using Dapper;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class CampaignRepository : ICampaignRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public CampaignRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Campaign>> GetByIncidentIdAsync(Guid incidentId)
        {
            var query = "SELECT * FROM \"Campaigns\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<Campaign>(query, new { IncidentId = incidentId });
        }

        public async Task AddAsync(Campaign campaign)
        {
            _efContext.Campaigns.Add(campaign);
            await _efContext.SaveChangesAsync();
        }
    }

    public class DonationRepository : IDonationRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public DonationRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<DonationMoney>> GetByIncidentIdAsync(Guid incidentId)
        {
            var query = "SELECT * FROM \"Donations\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<DonationMoney>(query, new { IncidentId = incidentId });
        }

        public async Task AddAsync(DonationMoney donation)
        {
            _efContext.Donations.Add(donation);
            await _efContext.SaveChangesAsync();
        }
    }

    public class ExpenseRepository : IExpenseRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public ExpenseRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<Expense>> GetByIncidentIdAsync(Guid incidentId)
        {
            var query = "SELECT * FROM \"Expenses\" WHERE \"IncidentId\" = @IncidentId";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<Expense>(query, new { IncidentId = incidentId });
        }

        public async Task AddAsync(Expense expense)
        {
            _efContext.Expenses.Add(expense);
            await _efContext.SaveChangesAsync();
        }
    }
}

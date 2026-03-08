using SOSLocation.Domain.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;
using System; // Added for Guid

namespace SOSLocation.Domain.Interfaces
{
    public interface IIncidentRepository
    {
        Task<Incident?> GetByIdAsync(Guid id);
        Task<IEnumerable<Incident>> GetAllAsync();
        IQueryable<Incident> GetQueryable();
        Task AddAsync(Incident incident);
        Task UpdateAsync(Incident incident);
        Task DeleteAsync(Guid id);
        Task<int> GetCountAsync();
    }

    public interface IAttentionAlertRepository
    {
        Task<IEnumerable<AttentionAlert>> GetAllAsync();
        Task<AttentionAlert?> GetByIdAsync(Guid id);
        Task AddAsync(AttentionAlert alert);
        Task<int> GetCountAsync(string? severity = null);
    }

    public interface IRescueGroupRepository
    {
        Task<IEnumerable<RescueGroup>> GetAllAsync();
        Task AddAsync(RescueGroup group);
        Task<int> GetCountByStatusAsync(params string[] statuses);
    }

    public interface ISupplyLogisticsRepository
    {
        Task<IEnumerable<SupplyLogistics>> GetAllAsync();
        Task AddAsync(SupplyLogistics item);
        Task<int> GetCountByStatusAsync(string status);
    }

    public interface ISearchAreaRepository
    {
        Task<IEnumerable<SearchArea>> GetByIncidentIdAsync(Guid incidentId);
        IQueryable<SearchArea> GetQueryable();
        Task AddAsync(SearchArea area);
        Task UpdateAsync(SearchArea area);
    }

    public interface IAssignmentRepository
    {
        Task<IEnumerable<Assignment>> GetAllAsync();
        Task<IEnumerable<Assignment>> GetByIncidentIdAsync(Guid incidentId);
        Task AddAsync(Assignment assignment);
    }

    public interface IHubRepository
    {
        Task<IEnumerable<EdgeHub>> GetAllAsync();
        Task AddAsync(EdgeHub hub);
    }

    public interface ICampaignRepository
    {
        Task<IEnumerable<Campaign>> GetByIncidentIdAsync(Guid incidentId);
        Task AddAsync(Campaign campaign);
    }

    public interface IDonationRepository
    {
        Task<IEnumerable<DonationMoney>> GetByIncidentIdAsync(Guid incidentId);
        Task AddAsync(DonationMoney donation);
    }

    public interface IExpenseRepository
    {
        Task<IEnumerable<Expense>> GetByIncidentIdAsync(Guid incidentId);
        Task AddAsync(Expense expense);
    }

    public interface IGeolocationRepository
    {
        Task<IEnumerable<Geolocation>> GetAllAsync();
        IQueryable<Geolocation> GetQueryable();
        Task AddAsync(Geolocation geolocation);
    }

    public interface IVisitedLocationRepository
    {
        Task<IEnumerable<VisitedLocation>> GetAllAsync();
        Task AddAsync(VisitedLocation location);
    }

    public interface IFoundPeopleRepository
    {
        Task<IEnumerable<FoundPeople>> GetAllAsync();
        Task AddAsync(FoundPeople person);
    }
}

using SOSLocation.Domain.Incidents;
using SOSLocation.Domain.Missions;
using SOSLocation.Domain.Tracking;
using SOSLocation.Domain.Shared;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Threading;
using System.Linq;
using System;

namespace SOSLocation.Domain.Interfaces
{
    public interface IIncidentRepository
    {
        Task<Incident?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<IEnumerable<Incident>> GetAllAsync(CancellationToken ct = default);
        IQueryable<Incident> GetQueryable();
        Task AddAsync(Incident incident, CancellationToken ct = default);
        Task UpdateAsync(Incident incident, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
        Task<int> GetCountAsync(CancellationToken ct = default);
    }

    public interface IAttentionAlertRepository
    {
        Task<IEnumerable<AttentionAlert>> GetAllAsync(CancellationToken ct = default);
        Task<AttentionAlert?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task AddAsync(AttentionAlert alert, CancellationToken ct = default);
        Task<int> GetCountAsync(string? severity = null, CancellationToken ct = default);
    }

    public interface IRescueGroupRepository
    {
        Task<IEnumerable<RescueGroup>> GetAllAsync(CancellationToken ct = default);
        Task AddAsync(RescueGroup group, CancellationToken ct = default);
        Task<int> GetCountByStatusAsync(CancellationToken ct = default, params string[] statuses);
    }

    public interface ISupplyLogisticsRepository
    {
        Task<IEnumerable<SupplyLogistics>> GetAllAsync(CancellationToken ct = default);
        Task AddAsync(SupplyLogistics item, CancellationToken ct = default);
        Task<int> GetCountByStatusAsync(string status, CancellationToken ct = default);
    }

    public interface ISearchAreaRepository
    {
        Task<IEnumerable<SearchArea>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default);
        IQueryable<SearchArea> GetQueryable();
        Task AddAsync(SearchArea area, CancellationToken ct = default);
        Task UpdateAsync(SearchArea area, CancellationToken ct = default);
    }

    public interface IAssignmentRepository
    {
        Task<IEnumerable<Assignment>> GetAllAsync(CancellationToken ct = default);
        Task<IEnumerable<Assignment>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default);
        Task AddAsync(Assignment assignment, CancellationToken ct = default);
    }

    public interface IHubRepository
    {
        Task<IEnumerable<EdgeHub>> GetAllAsync(CancellationToken ct = default);
        Task AddAsync(EdgeHub hub, CancellationToken ct = default);
    }

    public interface ICampaignRepository
    {
        Task<IEnumerable<Campaign>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default);
        Task AddAsync(Campaign campaign, CancellationToken ct = default);
    }

    public interface IDonationRepository
    {
        Task<IEnumerable<DonationMoney>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default);
        Task AddAsync(DonationMoney donation, CancellationToken ct = default);
    }

    public interface IExpenseRepository
    {
        Task<IEnumerable<Expense>> GetByIncidentIdAsync(Guid incidentId, CancellationToken ct = default);
        Task AddAsync(Expense expense, CancellationToken ct = default);
    }

    public interface IGeolocationRepository
    {
        Task<IEnumerable<Geolocation>> GetAllAsync(CancellationToken ct = default);
        IQueryable<Geolocation> GetQueryable();
        Task AddAsync(Geolocation geolocation, CancellationToken ct = default);
    }

    public interface IVisitedLocationRepository
    {
        Task<IEnumerable<VisitedLocation>> GetAllAsync(CancellationToken ct = default);
        Task AddAsync(VisitedLocation location, CancellationToken ct = default);
    }

    public interface IFoundPeopleRepository
    {
        Task<IEnumerable<FoundPeople>> GetAllAsync(CancellationToken ct = default);
        Task AddAsync(FoundPeople person, CancellationToken ct = default);
    }
}

import { apiClient } from './apiClient';

export type DomainEvent = {
  id: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  payload: unknown;
  timestamp: string;
  actor_user_id: string;
};

export const eventsApi = {
  async list(): Promise<DomainEvent[]> {
    const { data } = await apiClient.get<DomainEvent[]>('/api/events');
    return data;
  }
};

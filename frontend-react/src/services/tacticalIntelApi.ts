import axios from 'axios';

export interface OperationalPoint {
  id?: string;
  type: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  isApproved?: boolean;
  status?: string;
}

export const tacticalIntelApi = {
  getPoints: async () => {
    const response = await axios.get<OperationalPoint[]>('/api/tactical-intel');
    return response.data;
  },
  
  createPoint: async (point: OperationalPoint) => {
    const response = await axios.post<OperationalPoint>('/api/tactical-intel', point);
    return response.data;
  },

  approvePoint: async (id: string) => {
    await axios.patch(`/api/tactical-intel/${id}/approve`);
  },

  deletePoint: async (id: string) => {
    await axios.delete(`/api/tactical-intel/${id}`);
  }
};

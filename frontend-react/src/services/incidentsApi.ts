import { apiClient } from './apiClient';

export const incidentsApi = {
  async uploadCollapseReport(payload: {
    video: File;
    latitude: number;
    longitude: number;
    locationName: string;
    description?: string;
    reporterName?: string;
    reporterPhone?: string;
  }) {
    const form = new FormData();
    form.append('video', payload.video);
    form.append('latitude', String(payload.latitude));
    form.append('longitude', String(payload.longitude));
    form.append('locationName', payload.locationName);
    if (payload.description) form.append('description', payload.description);
    if (payload.reporterName) form.append('reporterName', payload.reporterName);
    if (payload.reporterPhone) form.append('reporterPhone', payload.reporterPhone);

    const response = await apiClient.post('/api/collapse-reports', form);
    return response.data;
  },
};

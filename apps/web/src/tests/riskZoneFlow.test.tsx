import type { PropsWithChildren } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisasterManagementPanel } from '../features/disaster-management/DisasterManagementPanel';
import { useAppStore } from '../stores/appStore';

function renderWithQueryClient(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(component, { wrapper: Wrapper });
}

const REVISION = {
  id: 'rev-1',
  cityId: 'city-1',
  revisionNumber: 1,
  status: 'published',
  reconstructionProfile: 'osm-basic-v1',
  qualityLevel: 'L2FootprintsInferredHeights',
  sourceSummary: null,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const ZONE = {
  id: 'zone-1',
  cityRevisionId: 'rev-1',
  name: 'Riverside flood risk',
  hazardType: 'flood',
  level: 'high',
  notes: 'Low-lying area',
  geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  createdAt: new Date().toISOString(),
};

describe('disaster management panel', () => {
  beforeEach(() => {
    useAppStore.getState().setSelectedRevision(REVISION);
  });

  afterEach(() => {
    useAppStore.getState().setSelectedRevision(null);
    vi.unstubAllGlobals();
  });

  it('lists risk zones for the selected revision', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([ZONE]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));

    renderWithQueryClient(<DisasterManagementPanel />);

    await waitFor(() => expect(screen.getByText('Riverside flood risk')).toBeInTheDocument());
    expect(screen.getByText('flood · high')).toBeInTheDocument();
    expect(screen.getByText('Low-lying area')).toBeInTheDocument();
  });

  it('deletes a zone after confirmation and refreshes the list', async () => {
    let listCallCount = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.includes('/risk-zones') && !url.includes('/exposure')) {
        listCallCount += 1;
        const body = listCallCount === 1 ? [ZONE] : [];
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithQueryClient(<DisasterManagementPanel />);

    await waitFor(() => expect(screen.getByText('Riverside flood risk')).toBeInTheDocument());
    fireEvent.click(screen.getByText('delete'));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/risk-zones/zone-1'), expect.objectContaining({ method: 'DELETE' })),
    );
    await waitFor(() => expect(screen.queryByText('Riverside flood risk')).not.toBeInTheDocument());
  });

  it('fetches and displays exposure for a zone', async () => {
    const exposure = {
      zoneId: 'zone-1',
      buildingCount: 5,
      averageHeightMeters: 7.2,
      byType: [{ buildingType: 'residential', count: 5 }],
    };
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/exposure')) {
        return Promise.resolve(
          new Response(JSON.stringify(exposure), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );
      }
      if (url.includes('/risk-zones')) {
        return Promise.resolve(
          new Response(JSON.stringify([ZONE]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }));

    renderWithQueryClient(<DisasterManagementPanel />);

    await waitFor(() => expect(screen.getByText('Riverside flood risk')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('exposure-zone-1'));

    await waitFor(() =>
      expect(screen.getByText('5 buildings · avg height 7.2m')).toBeInTheDocument(),
    );
    expect(screen.getByText('residential: 5')).toBeInTheDocument();
  });
});

import type { PropsWithChildren } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DisasterManagementPanel,
  KUMAMOTO_SCENARIO_KEY,
} from '../features/disaster-management/DisasterManagementPanel';
import { useAppStore } from '../stores/appStore';

const SUMMARY = {
  activeFeatures: 0,
  priorityOne: 0,
  confirmedVictims: 0,
  estimatedVictims: 0,
  peopleRescued: 0,
  riskAreas: 0,
  safeAreas: 0,
  searchSectors: 0,
  supportPoints: 0,
  trafficInterruptions: 0,
  assignedTeams: 0,
  lastUpdatedAt: new Date().toISOString(),
};

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<DisasterManagementPanel />, { wrapper: Wrapper });
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Kumamoto crisis operations', () => {
  afterEach(() => {
    useAppStore.getState().endOperationalDraw();
    useAppStore.getState().setPendingOperationalGeometry(null);
    useAppStore.getState().setSelectedRevision(null);
    vi.unstubAllGlobals();
  });

  it('starts the correct map geometry tool for a traffic interruption', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      return Promise.resolve(response(url.includes('operations-summary') ? SUMMARY : []));
    }));

    renderPanel();
    fireEvent.click(screen.getByTestId('draw-traffic-interruption'));

    expect(useAppStore.getState().operationalDraw).toMatchObject({
      featureType: 'traffic-interruption',
      geometryKind: 'line',
      vertexCount: 0,
    });
  });

  it('creates a priority search sector with victims and assigned team', async () => {
    const geometry: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[130.7, 32.68], [130.72, 32.68], [130.72, 32.7], [130.7, 32.68]]],
    };
    useAppStore.getState().setPendingOperationalGeometry({
      featureType: 'search-sector',
      geometry,
    });

    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        const request = JSON.parse(String(init.body));
        return Promise.resolve(response({
          id: 'operation-1',
          disasterScenarioId: 'scenario-1',
          ...request,
          assignedTeam: request.assignedTeam ?? null,
          capacity: request.capacity ?? null,
          resources: request.resources ?? null,
          notes: request.notes ?? null,
          effectiveFrom: new Date().toISOString(),
          effectiveTo: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, 201));
      }
      return Promise.resolve(response(url.includes('operations-summary') ? SUMMARY : []));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPanel();
    fireEvent.change(screen.getByLabelText('Nome da marcação'), {
      target: { value: 'Setor P1 Centro' },
    });
    fireEvent.change(screen.getByText('P2 · alta').closest('select')!, {
      target: { value: '1' },
    });
    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('Ex.: SAR-03'), {
      target: { value: 'SAR-03' },
    });
    fireEvent.click(screen.getByText('Adicionar ao quadro'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `/disaster-scenarios/${KUMAMOTO_SCENARIO_KEY}/operations`,
      ),
      expect.objectContaining({ method: 'POST' }),
    ));
    const postCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    const payload = JSON.parse(String(postCall?.[1]?.body));
    expect(payload).toMatchObject({
      featureType: 'search-sector',
      name: 'Setor P1 Centro',
      priority: 1,
      confirmedVictims: 3,
      estimatedVictims: 3,
      assignedTeam: 'SAR-03',
    });
    await waitFor(() => expect(useAppStore.getState().pendingOperationalGeometry).toBeNull());
  });
});

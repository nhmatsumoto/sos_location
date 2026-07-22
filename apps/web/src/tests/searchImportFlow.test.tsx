import type { PropsWithChildren } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportPanel } from '../features/city-import/ImportPanel';
import { SearchPanel } from '../features/city-search/SearchPanel';
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

describe('city search and import flow', () => {
  beforeEach(() => {
    useAppStore.getState().setSelectedPlace(null);
    useAppStore.getState().setWatchedJobId(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('debounces rapid typing into one search request', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithQueryClient(<SearchPanel />);
    const input = screen.getByTestId('city-search-input');
    fireEvent.change(input, { target: { value: 'Ko' } });
    fireEvent.change(input, { target: { value: 'Kom' } });
    fireEvent.change(input, { target: { value: 'Komaki' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('q=Komaki');
  });

  it('sends the selected bounding box and metadata with the import request', async () => {
    const requests: RequestInit[] = [];
    const job = {
      id: '11111111-1111-1111-1111-111111111111',
      cityId: null,
      cityRevisionId: null,
      jobType: 'openstreetmap-import',
      status: 'queued',
      progress: 0,
      currentStage: null,
      stageMessage: null,
      error: null,
      attempts: 0,
      nextAttemptAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const fetchMock = vi.fn().mockImplementation((_: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        requests.push(init);
        return Promise.resolve(new Response(JSON.stringify(job), { status: 202 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    useAppStore.getState().setSelectedPlace({
      providerId: 'relation/123',
      provider: 'nominatim',
      name: 'Komaki',
      country: 'Japan',
      countryCode: 'JP',
      region: 'Aichi',
      centerLon: 136.91,
      centerLat: 35.29,
      west: 136.85,
      south: 35.25,
      east: 136.97,
      north: 35.33,
    });

    renderWithQueryClient(<ImportPanel />);
    fireEvent.click(screen.getByTestId('start-import'));

    await waitFor(() => expect(requests).toHaveLength(1));
    const body = JSON.parse(String(requests[0].body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      placeProviderId: 'relation/123',
      name: 'Komaki',
      countryCode: 'JP',
      region: 'Aichi',
      boundingBox: { west: 136.85, south: 35.25, east: 136.97, north: 35.33 },
    });
  });

  it('lists failed operations with diagnostics but hides cancelled operations', async () => {
    const createdAt = new Date().toISOString();
    const makeJob = (jobType: string, status: string) => ({
      id: `${jobType}-id`,
      cityId: null,
      cityRevisionId: null,
      jobType,
      status,
      progress: status === 'completed' ? 100 : 0,
      currentStage: null,
      stageMessage: null,
      error: status === 'failed' ? 'diagnostic detail' : null,
      attempts: status === 'failed' ? 3 : 0,
      nextAttemptAt: null,
      startedAt: null,
      completedAt: null,
      createdAt,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([
      makeJob('queued-import', 'queued'),
      makeJob('completed-import', 'completed'),
      makeJob('failed-import', 'failed'),
      makeJob('cancelled-import', 'cancelled'),
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    renderWithQueryClient(<ImportPanel />);

    await waitFor(() => expect(screen.getByText('queued-import')).toBeInTheDocument());
    expect(screen.getByText('completed-import')).toBeInTheDocument();
    expect(screen.getByText('failed-import')).toBeInTheDocument();
    expect(screen.queryByText('cancelled-import')).not.toBeInTheDocument();
    expect(screen.getByText('diagnostic detail')).toBeInTheDocument();
  });
});

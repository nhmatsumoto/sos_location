import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { DataSourceList } from './DataSourceList';

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
  setApiNotifier: vi.fn(),
}));

describe('DataSourceList', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    putMock.mockReset();
  });

  it('renders catalog entries returned by the API', async () => {
    getMock.mockResolvedValue({
      data: [
        {
          id: 'source-1',
          name: 'Feed INMET',
          type: 'Weather',
          providerType: 'Inmet',
          baseUrl: 'https://example.test/inmet',
          frequencyMinutes: 15,
          isActive: true,
          metadataJson: '{"region":"br"}',
        },
      ],
    });

    renderWithProviders(<DataSourceList />);

    await waitFor(() => {
      expect(screen.getByText('Feed INMET')).toBeInTheDocument();
    });

    expect(screen.getByText('https://example.test/inmet')).toBeInTheDocument();
    expect(screen.getByText('a cada 15 min')).toBeInTheDocument();
  });

  it('creates a new source from the modal workflow', async () => {
    getMock
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'source-2',
            name: 'Radar CEMADEN',
            type: 'Risk',
            providerType: 'Cemaden',
            baseUrl: 'https://example.test/cemaden',
            frequencyMinutes: 30,
            isActive: true,
            metadataJson: '{"region":"br-sp"}',
          },
        ],
      });
    postMock.mockResolvedValue({ data: {} });

    renderWithProviders(<DataSourceList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma fonte cadastrada')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Nova Fonte' }));

    fireEvent.change(screen.getByPlaceholderText('Ex: INMET Avisos Ativos'), {
      target: { value: 'Radar CEMADEN' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://api.exemplo.com/v1/data'), {
      target: { value: 'https://example.test/cemaden' },
    });
    fireEvent.change(screen.getByPlaceholderText('{"region":"br-sp","priority":"high"}'), {
      target: { value: '{"region":"br-sp"}' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar fonte' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/v1/data-sources',
        expect.objectContaining({
          name: 'Radar CEMADEN',
          baseUrl: 'https://example.test/cemaden',
          metadataJson: '{"region":"br-sp"}',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Radar CEMADEN')).toBeInTheDocument();
    });
  });
});

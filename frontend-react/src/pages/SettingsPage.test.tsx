import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';
import { renderWithProviders } from '../test/renderWithProviders';
import { SettingsPage } from './SettingsPage';

const { doLogoutMock, refreshSessionTokenMock, getActiveSessionTokenMock } = vi.hoisted(() => ({
  doLogoutMock: vi.fn(),
  refreshSessionTokenMock: vi.fn(),
  getActiveSessionTokenMock: vi.fn(),
}));

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
};

vi.mock('../lib/keycloak', () => ({
  doLogout: doLogoutMock,
  refreshSessionToken: refreshSessionTokenMock,
  getActiveSessionToken: getActiveSessionTokenMock,
  keycloak: {
    authenticated: true,
    tokenParsed: {
      exp: Math.floor(new Date('2030-01-01T12:00:00Z').getTime() / 1000),
    },
  },
}));

const renderSettingsPage = () =>
  renderWithProviders(<SettingsPage />);

describe('SettingsPage', () => {
  beforeEach(() => {
    const localStorageMock = createMemoryStorage();

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    doLogoutMock.mockReset();
    refreshSessionTokenMock.mockReset();
    refreshSessionTokenMock.mockResolvedValue(true);
    getActiveSessionTokenMock.mockReset();
    getActiveSessionTokenMock.mockReturnValue('session-token-1234567890-abcdefghijklmnop');

    useAuthStore.setState({
      authenticated: true,
      roles: ['coordinator'],
      token: 'store-token-abcdefghijklmnopqrstuvwxyz',
      user: {
        name: 'Nilton Matsumoto',
        email: 'nilton@example.com',
        preferredUsername: 'governo1',
        xp: 0,
        level: 1,
        rank: 'Recruta',
      },
    });
  });

  it('renders current identity, roles and derived capabilities', () => {
    renderSettingsPage();

    expect(screen.getByText('Nilton Matsumoto')).toBeInTheDocument();
    expect(screen.getAllByText('coordinator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('integration.read').length).toBeGreaterThan(0);
    expect(screen.getAllByText('simulation.run').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SESSION_ACTIVE \/\/ KEYCLOAK/).length).toBeGreaterThan(0);
  });

  it('persists local preferences when saving', async () => {
    renderSettingsPage();

    fireEvent.click(screen.getByLabelText('Modo de Alta Precisão'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Preferências' }));

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('sos-location-settings') ?? '{}') as {
        preferences?: { precisionMode?: boolean };
      };
      expect(persisted.preferences?.precisionMode).toBe(true);
    });

    expect(screen.getAllByText(/PREFERENCES_PERSISTED \/\/ LOCAL_PROFILE_UPDATED/).length).toBeGreaterThan(0);
  });

  it('refreshes the session and can trigger logout', async () => {
    renderSettingsPage();

    fireEvent.click(screen.getByRole('button', { name: 'Atualizar Sessão' }));

    await waitFor(() => {
      expect(refreshSessionTokenMock).toHaveBeenCalledWith(120);
    });

    expect(screen.getAllByText(/TOKEN_REFRESHED \/\/ SESSION_EXTENDED/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar Sessão' }));
    expect(doLogoutMock).toHaveBeenCalledTimes(1);
  });
});

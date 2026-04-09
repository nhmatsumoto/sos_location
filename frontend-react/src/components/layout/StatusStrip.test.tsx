import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { StatusStrip } from './StatusStrip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.simulations': 'Simulações',
      };

      return translations[key] ?? key;
    },
  }),
}));

describe('StatusStrip', () => {
  it('reflete o contexto da rota ativa no strip operacional', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/app/simulations']}>
        <StatusStrip />
      </MemoryRouter>,
    );

    expect(screen.getByText('Contexto ativo')).toBeInTheDocument();
    expect(screen.getByText('Inteligência')).toBeInTheDocument();
    expect(screen.getByText('Simulações')).toBeInTheDocument();
  });
});

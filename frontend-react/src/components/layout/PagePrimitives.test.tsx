import { Button, Text } from '@chakra-ui/react';
import { Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MetricCard, PageEmptyState, PageHeader } from './PagePrimitives';

describe('PagePrimitives', () => {
  it('renders header, metric card and empty state with semantic content', () => {
    renderWithProviders(
      <>
        <PageHeader
          icon={Database}
          eyebrow="INGESTION"
          title="Centro de fontes"
          description="Painel de integração"
          meta={<Text>estado nominal</Text>}
          actions={<Button>Sincronizar</Button>}
        />
        <MetricCard
          label="Pipelines ativos"
          value="12"
          helper="sem backlog"
          icon={Database}
          tone="success"
          isLive
        />
        <PageEmptyState
          title="Nada por aqui"
          description="Cadastre uma integração para continuar."
        />
      </>,
    );

    expect(screen.getByText('Centro de fontes')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar')).toBeInTheDocument();
    expect(screen.getByText('Pipelines ativos')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
  });
});

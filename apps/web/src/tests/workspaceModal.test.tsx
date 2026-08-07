import { useState, type PropsWithChildren } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceModal } from '../features/navigation/WorkspaceModal';
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

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open tools
      </button>
      <WorkspaceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('WorkspaceModal', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeWorkspace: 'map',
      selectedPlace: null,
      selectedCity: null,
      selectedRevision: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = '';
  });

  it('keeps the former sidebar content in a modal and restores focus on close', async () => {
    renderWithQueryClient(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open tools' });
    expect(screen.getByTestId('workspace-modal')).not.toBeVisible();

    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Ferramentas do sistema' })).toBeVisible();
    expect(screen.getByTestId('cities-panel')).toBeVisible();
    expect(screen.getByTestId('import-panel')).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByTestId('close-workspace-modal')).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(screen.getByTestId('workspace-modal')).not.toBeVisible());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('closes only when the backdrop itself is pressed', () => {
    renderWithQueryClient(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open tools' }));

    fireEvent.mouseDown(screen.getByTestId('workspace-modal'));
    expect(screen.getByTestId('workspace-modal')).toBeVisible();

    fireEvent.mouseDown(screen.getByTestId('workspace-modal-backdrop'));
    expect(screen.getByTestId('workspace-modal')).not.toBeVisible();
  });
});

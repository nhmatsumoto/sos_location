import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationalToolbox } from '../features/disaster-management/OperationalToolbox';
import { useAppStore } from '../stores/appStore';

describe('operational toolbox', () => {
  afterEach(() => {
    useAppStore.getState().endOperationalDraw();
    useAppStore.getState().setPendingOperationalGeometry(null);
  });

  it('starts alert and rescue tools with their required geometry', () => {
    const { unmount } = render(
      <OperationalToolbox onOpenOperations={vi.fn()} onOpenScientific={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId('toolbox-alert'));
    expect(useAppStore.getState().operationalDraw).toMatchObject({
      featureType: 'alert',
      geometryKind: 'point',
    });

    unmount();
    useAppStore.getState().endOperationalDraw();
    render(<OperationalToolbox onOpenOperations={vi.fn()} onOpenScientific={vi.fn()} />);
    fireEvent.click(screen.getByTestId('toolbox-rescue-route'));
    expect(useAppStore.getState().operationalDraw).toMatchObject({
      featureType: 'rescue-route',
      geometryKind: 'line',
    });
  });

  it('opens the scientific and operational workspaces', () => {
    const openOperations = vi.fn();
    const openScientific = vi.fn();
    render(
      <OperationalToolbox
        onOpenOperations={openOperations}
        onOpenScientific={openScientific}
      />,
    );

    fireEvent.click(screen.getByTestId('open-scientific-analysis'));
    fireEvent.click(screen.getByTestId('open-operational-board'));

    expect(openScientific).toHaveBeenCalledOnce();
    expect(openOperations).toHaveBeenCalledOnce();
  });
});

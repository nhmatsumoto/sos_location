import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSimulationsController } from './useSimulationsController';
import { simulationsApi } from '../services/simulationsApi';

vi.mock('../services/simulationsApi', () => ({
  simulationsApi: {
    runSimulation: vi.fn(),
    indexUrbanPipeline: vi.fn(),
  },
}));

vi.mock('../services/dataHubApi', () => ({
  dataHubApi: {
    weatherForecast: vi.fn(() => new Promise(() => {})),
  },
}));

describe('useSimulationsController', () => {
  it('should initialize with default coordinates', () => {
    const { result } = renderHook(() => useSimulationsController());
    expect(result.current.lat).toBe('-21.1215');
    expect(result.current.lng).toBe('-42.9427');
    expect(result.current.numericLat).toBe(-21.1215);
  });

  it('should update numeric values when strings change', () => {
    const { result } = renderHook(() => useSimulationsController());
    
    act(() => {
      result.current.setLat('-20.0');
    });

    expect(result.current.numericLat).toBe(-20.0);
  });

  it('should handle runSimulation execution', async () => {
    const mockData = { 
      id: 'sim-123', 
      status: 'success',
      estimatedAffectedAreaM2: 5000,
      maxDepth: 1.5,
      floodedCells: 120
    };
    vi.mocked(simulationsApi.runSimulation).mockResolvedValue(mockData as never);

    const { result } = renderHook(() => useSimulationsController());

    let response: unknown;
    await act(async () => {
      response = await result.current.actions.runSimulation();
    });

    expect(response).toEqual(mockData);
    expect(result.current.resultData).toBeNull();
    expect(result.current.isSimulating).toBe(false);
    expect(simulationsApi.runSimulation).toHaveBeenCalledWith(expect.objectContaining({
      minLat: -21.1335,
      minLon: -42.9547,
      maxLat: -21.1095,
      maxLon: -42.9307,
    }));
  });
});

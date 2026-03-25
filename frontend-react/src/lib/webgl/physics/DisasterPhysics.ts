export interface DisasterState {
  type: string;
  intensity: number;
  time: number;
}

export class DisasterPhysics {
  /**
   * Calculates the earthquake vibration offset based on intensity and time.
   */
  public static calculateEarthquake(state: DisasterState): [number, number, number] {
    if (state.type !== 'EARTHQUAKE') return [0, 0, 0];
    
    const intensity = state.intensity / 100.0;
    const t = state.time;
    // Primary waves + secondary jitter
    const dx = Math.sin(t * 15.0) * 12.0 * intensity + Math.sin(t * 43.1) * 4.0 * intensity;
    const dy = Math.cos(t * 18.0) * 8.0 * intensity;
    const dz = Math.cos(t * 13.5) * 11.0 * intensity + Math.sin(t * 37.8) * 5.0 * intensity;
    
    return [dx, dy, dz];
  }

  /**
   * Calculates the current flood water level.
   */
  public static calculateFloodLevel(state: DisasterState, baseLevel: number = 0): number {
    if (state.type !== 'FLOOD') return baseLevel;
    
    const intensity = state.intensity / 100.0;
    const surge = Math.sin(state.time * 0.2) * 50.0 * intensity;
    return baseLevel + (intensity * 200.0) + surge;
  }

  /**
   * Tsunami specific logic (Phase tracking, wave front position).
   */
  public static calculateTsunami(state: DisasterState): { phase: number, waterLevel: number, waveProgress: number } {
    if (state.type !== 'TSUNAMI') return { phase: 0, waterLevel: 0, waveProgress: 0 };
    
    const t = state.time;
    let phase = 0;
    let waterLevel = 0;
    
    if (t < 5.0) phase = 0; // Quiet
    else if (t < 15.0) {
      phase = 1; // Withdrawal
      waterLevel = -(t - 5.0) * 20.0;
    } else if (t < 25.0) {
      phase = 2; // Wave incoming
      waterLevel = (t - 15.0) * 80.0 - 200.0;
    } else {
      phase = 3; // Inundation
      waterLevel = 600.0 + Math.sin(t * 0.1) * 100.0;
    }
    
    const waveProgress = phase >= 2 ? Math.min(1.0, (t - 15.0) / 10.0) : 0.0;
    
    return { phase, waterLevel, waveProgress };
  }
}

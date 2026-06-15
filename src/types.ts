/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemDiagnosticState {
  tension: 'normal' | 'scanning' | 'warning' | 'error';
  hydraulic: 'perfect' | 'scanning' | 'optimal' | 'low_pressure';
  controllerTemp: number; // degrees C
  doorCycle: 'success' | 'scanning' | 'testing' | 'halted';
  emergencyLight: 'ready' | 'scanning' | 'low_battery' | 'failure';
}

export interface ProjectEstimate {
  sector: 'commercial' | 'residential' | 'industrial' | 'modernization';
  floors: number;
  count: number;
  luxuryLevel: 'standard' | 'premium' | 'ultra_fakhama';
  estimatedCost: number;
  estimatedMonths: number;
}

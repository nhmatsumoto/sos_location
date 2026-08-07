import type { ComponentType } from 'react';
import type { SimulationRun } from '../../schemas/api';

export type ScientificToolCategory =
  | 'system'
  | 'source'
  | 'propagation'
  | 'intensity'
  | 'impact'
  | 'laboratory';

export interface ScientificToolProps {
  run: SimulationRun | null;
  onRequestMap?: () => void;
}

export interface ScientificToolDefinition {
  id: string;
  disasterType: string;
  category: ScientificToolCategory;
  title: string;
  shortTitle: string;
  description: string;
  outputs: string[];
  component: ComponentType<ScientificToolProps>;
}

/**
 * Registro extensível de ferramentas científicas. Cada módulo declara o tipo
 * de desastre que atende e é renderizado pelo mesmo workspace, sem condicionais
 * específicas no shell da aplicação.
 */
export class ScientificToolRegistry {
  private readonly tools = new Map<string, ScientificToolDefinition>();

  constructor(initialTools: ScientificToolDefinition[] = []) {
    for (const tool of initialTools) this.register(tool);
  }

  register(tool: ScientificToolDefinition) {
    const key = this.key(tool.disasterType, tool.id);
    if (this.tools.has(key)) {
      throw new Error(
        `Scientific tool "${tool.id}" is already registered for "${tool.disasterType}".`,
      );
    }
    this.tools.set(key, tool);
    return this;
  }

  list(disasterType: string) {
    return [...this.tools.values()].filter((tool) => tool.disasterType === disasterType);
  }

  supportedDisasters() {
    return [...new Set([...this.tools.values()].map((tool) => tool.disasterType))];
  }

  get(disasterType: string, toolId: string) {
    return this.tools.get(this.key(disasterType, toolId));
  }

  private key(disasterType: string, toolId: string) {
    return `${disasterType}:${toolId}`;
  }
}

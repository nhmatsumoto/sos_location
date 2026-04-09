import { describe, expect, it } from 'vitest';
import { toDomainChildPath } from './managedRoutes';

describe('toDomainChildPath', () => {
  it('converte rotas de operacoes para caminhos relativos', () => {
    expect(toDomainChildPath('/app/overview', '/app')).toBe('overview');
    expect(toDomainChildPath('/app/operational-map', '/app')).toBe('operational-map');
  });

  it('retorna string vazia para a raiz do dominio', () => {
    expect(toDomainChildPath('/settings', '/settings')).toBe('');
    expect(toDomainChildPath('/admin', '/admin')).toBe('');
  });

  it('falha quando a rota nao pertence ao dominio informado', () => {
    expect(() => toDomainChildPath('/transparency', '/app')).toThrow(
      'Route path "/transparency" does not belong to base "/app"',
    );
  });
});

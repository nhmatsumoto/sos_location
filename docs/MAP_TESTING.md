# MAP TESTING CHECKLIST

## Fluxo principal
- [ ] Abrir o Command Center e confirmar renderização do mapa.
- [ ] Alternar camadas no painel flutuante “Ferramentas” (Weather/Hotspots/Desaparecidos/3D).
- [ ] Clicar no mapa e validar abertura do popup de clima com dados Open-Meteo.
- [ ] Mover o controle “Time Interval” e confirmar mudança dos valores no popup.
- [ ] Ativar camada 3D e validar a coluna no ponto clicado acompanhando zoom/move.
- [ ] Arrastar, redimensionar, minimizar e fechar painéis; recarregar página e validar persistência local.
- [ ] Confirmar que os painéis flutuantes não bloqueiam interação do mapa fora deles.
- [ ] Verificar console sem erros CORS para chamadas `/api` e Open-Meteo.

## Regressão de dados operacionais
- [ ] Hotspots continuam visíveis com popup.
- [ ] Áreas de risco continuam como círculos.
- [ ] Pontos de apoio continuam como markers.
- [ ] Desaparecidos continuam com marcadores e listagem no painel.

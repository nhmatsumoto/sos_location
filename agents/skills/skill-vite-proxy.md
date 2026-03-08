# skill-vite-proxy
- **Relative Pathing**: No desenvolvimento, use caminhos relativos para `VITE_API_BASE_URL` (vazio no `.env`) para permitir que o Vite faça o proxy.
- **Protocol Matching**: Evite cross-protocol (HTTPS FE -> HTTP BE) chamando via proxy relativo para evitar Mixed Content.
- **Vite Proxy Config**: Verifique `vite.config.ts` se `/api` está apontando para o `devApiTarget` correto com `changeOrigin: true`.
- **Troubleshooting**: Se o console mostrar `ERR_CONNECTION_REFUSED` ou `ERR_EMPTY_RESPONSE`, verifique se o backend está rodando na porta configurada (ex: 8001).
- **CORS bypass**: O proxy do Vite resolve o CORS em desenvolvimento simulando chamadas da mesma origem.

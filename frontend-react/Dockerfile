# Etapa 1: Build da aplicação React/Vite com Bun, package manager oficial do projeto
FROM oven/bun:1.2.14-alpine AS builder

WORKDIR /app

# Instalar dependências primeiro para aproveitar o cache de camadas
COPY frontend-react/package.json frontend-react/bun.lock ./
RUN bun install --frozen-lockfile

# Cache bust: qualquer mudança no commit hash invalida o cache daqui para baixo
ARG BUILD_HASH=dev
RUN echo "BUILD_HASH=${BUILD_HASH}"

# Copiar códigos fonte
COPY frontend-react/ .

# Copiar documentação do projeto para ser servida como arquivos estáticos
RUN rm -rf public/docs && mkdir -p public/docs
COPY docs/ public/docs/

# Configurações de ambiente para o build
ARG VITE_API_BASE_URL="http://localhost:8001"
ARG VITE_KEYCLOAK_URL="http://localhost:8080"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_KEYCLOAK_URL=${VITE_KEYCLOAK_URL}
ENV NODE_ENV=production

# Executar build otimizado
RUN bun run build:only

# Etapa 2: Servir os arquivos minificados usando Nginx (Versão sem privilégios de root)
FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN apk add --no-cache curl
USER 101

# Ajustar configuração (o nginx-unprivileged usa /etc/nginx/conf.d/default.conf por padrão)
COPY --chown=101:101 frontend-react/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html

# Copia os arquivos compilados da etapa anterior
COPY --from=builder --chown=101:101 /app/dist .

# Expõe a porta 8000 (nginx-unprivileged já vem configurado para portas > 1024)
EXPOSE 8000

# O Nginx inicia automaticamente
CMD ["nginx", "-g", "daemon off;"]

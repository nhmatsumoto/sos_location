# Etapa 1: Build da aplicação React/Vite com Bun
FROM oven/bun:1.2.14-alpine AS builder

WORKDIR /app
COPY package.json package-lock.* bun.lock* ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install

COPY . .
ARG VITE_API_BASE_URL="http://localhost:8001"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN bun run build

# Etapa 2: Servir os arquivos minificados usando Nginx para suporte a SPA
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia a configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/

WORKDIR /usr/share/nginx/html

# Copia os arquivos compilados da etapa anterior
COPY --from=builder /app/dist .

# Expõe a porta 8000 para acesso (mesma porta configurada no nginx.conf)
EXPOSE 8000

# O Nginx inicia automaticamente
CMD ["nginx", "-g", "daemon off;"]

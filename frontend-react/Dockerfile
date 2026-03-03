# Etapa 1: Build da aplicação React/Vite com Bun
FROM oven/bun:1.2.14-alpine AS builder

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
ARG VITE_API_BASE_URL="http://localhost:8001"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN bun run build

# Etapa 2: Servir os arquivos minificados usando Python
FROM python:3.11-slim

WORKDIR /app/dist

# Copia os arquivos compilados da etapa anterior
COPY --from=builder /app/dist .

# Expõe a porta 8000 para acesso
EXPOSE 8000

# Usa o servidor HTTP nativo do Python para servir a pasta (equivalente a Nginx para sites estáticos simples)
CMD ["python", "-m", "http.server", "8000", "--bind", "0.0.0.0"]

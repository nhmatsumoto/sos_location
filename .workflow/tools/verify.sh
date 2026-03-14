#!/bin/bash
# .workflow/tools/verify.sh
# Script de verificação de integridade técnica para prevenir erros de build CI.

set -e

echo "🔍 Iniciando verificação técnica..."

# 1. Backend Build
echo "🚀 Verificando Backend (.NET)..."
cd "$(dirname "$0")/../../backend-dotnet"
dotnet build SOSLocation.slnx -c Release

# 2. Frontend Build
echo "🎨 Verificando Frontend (React)..."
cd "../frontend-react"
# Note: Usando npm como fallback se bun não estiver no path local
if command -v bun &> /dev/null; then
  bun run build
else
  npm run build
fi

echo "✅ Verificação concluída com sucesso. Nenhum erro técnico detectado."

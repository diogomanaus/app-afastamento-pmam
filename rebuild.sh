#!/bin/bash
# =====================================================
# SCAF – Rebuild completo do sistema
# Execute: bash rebuild.sh
# =====================================================

set -e

PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
echo ""
echo "🔄  Parando containers..."
cd "$PROJ_DIR"
docker compose down

echo ""
echo "🔨  Reconstruindo imagens (backend + frontend)..."
docker compose build --no-cache

echo ""
echo "🚀  Subindo containers..."
docker compose up -d

echo ""
echo "⏳  Aguardando backend iniciar..."
sleep 8

echo ""
echo "✅  Verificando saúde do backend..."
curl -s http://localhost/api/health || echo "Backend ainda inicializando, aguarde alguns segundos."

echo ""
echo "================================================="
echo "  Sistema SCAF disponível em:"
echo "  http://localhost"
echo "  https://pueblo-sensation-flogging.ngrok-free.dev"
echo "================================================="

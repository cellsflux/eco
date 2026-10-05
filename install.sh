#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/frontend"
echo "📦 Installation des dépendances frontend..."
pnpm install

cd "$(dirname "$0")/backend"
echo "📦 Installation des dépendances backend..."
pnpm install

echo "✅ Installation terminée !"

wait
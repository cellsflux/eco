#!/usr/bin/env bash

cd "$(dirname "$0")/frontend"

echo "🚀 Démarrage du frontend..."
pnpm run dev &

cd "$(dirname "$0")/backend"

echo "🚀 Démarrage du backend..."
pnpm run dev &

wait
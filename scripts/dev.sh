#!/bin/bash
set -e

# Run frontend and backend dev servers together
pnpm --filter @worldwar2/frontend dev &
FRONT_PID=$!

pnpm --filter @worldwar2/backend start:dev

wait $FRONT_PID

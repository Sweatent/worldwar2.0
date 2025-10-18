#!/bin/bash
set -e

echo "🚀 Setting up World War 2.0 development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy environment variables if .env doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
fi

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL + Redis)..."
docker-compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "🗄️  Running database migrations..."
cd packages/backend
npx prisma generate
npx prisma migrate dev --name init --skip-seed || echo "Database already initialized"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:4000"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:     localhost:6379"

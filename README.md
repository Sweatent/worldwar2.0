# World War 2.0 - Multiplayer Strategy Game

## 🎮 Project Overview

World War 2.0 is a 4-6 player multiplayer web-based strategy game where players start from asymmetric positions and compete for world domination through economic, military, diplomatic, and technological means.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd worldwar2.0

# Copy environment variables
cp .env.example .env

# Run setup script
./scripts/setup.sh
```

### Development

```bash
# Start Docker services (PostgreSQL + Redis)
docker-compose -f docker/docker-compose.yml up -d

# Start development servers
pnpm dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

### Available Scripts

```bash
pnpm dev          # Start dev servers (frontend + backend)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm type-check   # Type check all packages
pnpm test         # Run tests
pnpm clean        # Clean node_modules and build artifacts
```

## 📦 Project Structure

```
worldwar2.0/
├── packages/
│   ├── frontend/          # React + TypeScript + Vite
│   ├── backend/           # Nest.js + TypeScript
│   └── shared/            # Shared types and utilities
├── docs/                  # Documentation
├── docker/                # Docker configuration
├── scripts/               # Utility scripts
└── .github/workflows/     # CI/CD pipelines
```

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Pixi.js** - WebGL game rendering
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io Client** - Real-time communication

### Backend
- **Nest.js** - Node.js framework
- **TypeScript** - Type safety
- **Socket.io** - WebSocket server
- **Prisma** - ORM
- **Bull** - Job queues
- **PostgreSQL** - Primary database
- **Redis** - Cache & real-time data

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Commitlint** - Commit message validation
- **GitHub Actions** - CI/CD

## 📖 Documentation

- [Game Design](docs/game-design/) - Game mechanics and rules
- [Architecture](docs/architecture/) - System architecture
- [API Documentation](docs/api/) - API reference

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

## 📄 License

This project is licensed under the MIT License.

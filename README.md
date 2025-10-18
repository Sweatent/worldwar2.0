# Grand Strategy Game - Data Models and Persistence Layer

This is a monorepo for a grand strategy game inspired by Hearts of Iron and Civilization.

## Project Structure

```
grand-strategy-monorepo/
├── packages/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema
│   │   │   └── seed.ts          # Seed data script
│   │   └── src/
│   │       └── common/
│   │           ├── repository/  # Repository pattern implementations
│   │           └── redis/       # Redis caching service
│   └── shared/
│       └── src/
│           └── types/           # Shared TypeScript types
├── package.json
└── README.md
```

## Tech Stack

- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **Backend**: NestJS (framework structure)
- **TypeScript**: Shared types across packages

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cd packages/backend
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. Generate Prisma client:
```bash
cd packages/backend
npx prisma generate
```

4. Run database migrations:
```bash
npm run migrate
```

5. Seed the database with test data:
```bash
npm run db:seed
```

## Database Schema

### Core Entities

1. **Player** - User accounts and statistics
2. **GameRoom** - Game session management
3. **Nation** - Player's in-game nation with resources and stats
4. **Territory** - Map territories with resources and strategic value
5. **MilitaryUnit** - Army units with stats and location
6. **General** - Military commanders with attributes
7. **Technology** - Tech tree system with research progress
8. **Building** - Infrastructure and production buildings
9. **DiplomaticRelation** - Inter-nation relationships
10. **GameEvent** - Dynamic events and player decisions
11. **Achievement** - Player achievements system
12. **GameState** - Save/load game state snapshots

## Redis Caching Strategy

### Cache Keys

- `game:room:{roomId}:state` - Real-time game state
- `player:session:{playerId}` - Player session data
- `game:room:{roomId}:players` - Active players in room (Set)
- `leaderboard:military:{roomId}` - Military power rankings (Sorted Set)
- `leaderboard:economy:{roomId}` - Economic rankings (Sorted Set)
- `game:room:{roomId}:actions` - Player action queue (List)
- `game:room:{roomId}:events` - Event notifications (Pub/Sub)

## Repository Pattern

All data access is abstracted through repository classes:

- `PlayerRepository`
- `GameRoomRepository`
- `NationRepository`
- `TerritoryRepository`
- `MilitaryUnitRepository`
- `TechProgressRepository`

Each repository extends `BaseRepository` with common CRUD operations.

## Scripts

### Backend

```bash
# Generate Prisma client
npm run prisma:generate

# Create new migration
npm run migrate

# Reset database
npm run migrate:reset

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio

# Build
npm run build

# Development mode
npm run start:dev
```

## Data Models Overview

### Resources Structure

Each nation has a resources JSON object:
```typescript
{
  food: number
  wood: number
  ore: number
  energy: number
  rubber: number
  rareMetals: number
  oil: number
  uranium: number
  money: number
  researchPoints: number
  manpower: number
}
```

### Game Phases

Games progress through phases:
- ECONOMY - Resource production and management
- DIPLOMACY - Inter-nation negotiations
- MILITARY - Combat and troop movements
- TECH - Research progress
- EVENTS - Handle random/triggered events

### Asymmetric Starting Conditions

Nations can start with different conditions:
- **Wealth**: EXTREME_POVERTY to SUPER_RICH
- **Technology**: Level 1-10
- **Population**: Variable
- **Territory**: Different starting sizes

## Performance Optimizations

- Indexed frequently queried fields
- Connection pooling via Prisma
- Redis caching for real-time data
- Batch operations for bulk updates
- Pagination for large data sets

## Testing

Run tests:
```bash
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## License

Private - All rights reserved

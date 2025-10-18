# Data Models and Persistence Layer Implementation

## ✅ Implementation Status

This document outlines the completed implementation of Task 03 - Data Models and Persistence Layer.

### Completed Components

#### 1. Prisma Schema (`packages/backend/prisma/schema.prisma`)

Complete database schema with all core entities:

- ✅ **Player** - User accounts with stats and achievements
- ✅ **GameRoom** - Game session management with configurable settings
- ✅ **GameRoomPlayer** - Join table for room participants
- ✅ **Nation** - In-game nations with resources, policies, and asymmetric starts
- ✅ **Territory** - Map territories with terrain types and resource production
- ✅ **Building** - Infrastructure and production buildings
- ✅ **MilitaryUnit** - Army units with stats, morale, and supply
- ✅ **General** - Military commanders with attributes and traits
- ✅ **TechDefinition** - Technology definitions (static data)
- ✅ **TechProgress** - Per-nation research progress
- ✅ **DiplomaticRelation** - Inter-nation relationships and agreements
- ✅ **GameEvent** - Dynamic events with FOMO mechanics
- ✅ **Achievement** - Player achievement system
- ✅ **PlayerAchievement** - Unlocked achievements join table
- ✅ **GameState** - Save/load game state snapshots

**Schema Features:**
- Proper foreign key relationships with cascade behaviors
- Indexed fields for query optimization
- Enums for type safety
- JSON fields for flexible data structures
- BigInt support for large population values

#### 2. Redis Service (`packages/backend/src/common/redis/redis.service.ts`)

Complete Redis caching service with:

- ✅ String operations (get, set, del, exists, expire)
- ✅ Hash operations (hset, hget, hgetall, hdel, hkeys)
- ✅ Set operations (sadd, srem, smembers, sismember, scard)
- ✅ Sorted set operations (zadd, zrem, zrange, zrevrange, zscore, zincrby)
- ✅ List operations (lpush, rpush, lpop, rpop, lrange, llen, ltrim)
- ✅ Pub/Sub support (publish, subscribe, unsubscribe)
- ✅ Transaction support (multi)
- ✅ Automatic JSON serialization/deserialization
- ✅ Connection lifecycle management (OnModuleInit, OnModuleDestroy)
- ✅ Error handling and retry strategy

#### 3. Repository Pattern

**Base Repository** (`packages/backend/src/common/repository/base.repository.ts`):
- ✅ Generic CRUD operations (findById, findMany, create, update, delete)
- ✅ Type-safe model accessor
- ✅ Flexible options support for queries

**Specific Repositories:**
- ✅ **PlayerRepository** - User-specific queries (by username/email, stats updates)
- ✅ **GameRoomRepository** - Room management (by code, status, player operations)
- ✅ **NationRepository** - Nation queries (by room/player, resource updates)
- ✅ **TerritoryRepository** - Territory queries (by type, nation, neutral)
- ✅ **MilitaryUnitRepository** - Unit management (by nation/territory/type, status updates)
- ✅ **TechProgressRepository** - Research tracking (by nation, progress updates)

#### 4. Shared Types (`packages/shared/src/types/index.ts`)

TypeScript interfaces for:
- ✅ Resources structure
- ✅ Game configuration
- ✅ Realtime game state
- ✅ Player session
- ✅ Leaderboard entries
- ✅ Game actions
- ✅ Tech effects
- ✅ Event options
- ✅ Diplomatic modifiers
- ✅ General traits
- ✅ Achievement conditions
- ✅ Building effects
- ✅ Policy configuration
- ✅ Redis cache keys helper
- ✅ Cache TTL configurations

#### 5. Database Seed Script (`packages/backend/prisma/seed.ts`)

Complete test data including:
- ✅ 3 test players
- ✅ 2 achievements with player unlock
- ✅ 2 tech definitions
- ✅ 1 demo game room with players
- ✅ 1 nation with complete setup
- ✅ 2 territories (capital + mountain region)
- ✅ 2 buildings (research lab + military base)
- ✅ 1 general with traits
- ✅ 2 military units
- ✅ 2 tech progress entries
- ✅ 1 diplomatic relation
- ✅ 1 game event
- ✅ 1 game state snapshot

#### 6. Project Structure

✅ Monorepo setup with workspaces
✅ Backend package with NestJS structure
✅ Shared types package
✅ TypeScript configurations
✅ Environment configuration (.env.example)
✅ .gitignore with proper exclusions
✅ Package.json scripts for all operations
✅ README.md with documentation

## Redis Caching Strategy

### Implemented Cache Patterns

1. **Real-time Game State** (String)
   - Key: `game:room:{roomId}:state`
   - TTL: 3600s (1 hour after game ends)
   - Data: Current turn, phase, active players

2. **Player Sessions** (Hash)
   - Key: `player:session:{playerId}`
   - TTL: 604800s (7 days)
   - Fields: socketId, currentRoomId, lastActiveAt, isOnline

3. **Room Players** (Set)
   - Key: `game:room:{roomId}:players`
   - Members: Player IDs
   - Operations: Add/remove on join/leave

4. **Leaderboards** (Sorted Set)
   - Keys: `leaderboard:military:{roomId}`, `leaderboard:economy:{roomId}`
   - Score: Military power / economic strength
   - TTL: 300s (5 minutes)

5. **Action Queue** (List)
   - Key: `game:room:{roomId}:actions`
   - Operations: Push actions, pop for processing
   - TTL: 60s (1 minute)

6. **Event Notifications** (Pub/Sub)
   - Channel: `game:room:{roomId}:events`
   - Real-time event broadcasting

## Database Indexes

Optimized queries with indexes on:
- Player: username, email
- GameRoom: roomCode, status, hostId
- Nation: gameRoomId, playerId, capitalId
- Territory: nationId, gameRoomId, x/y coordinates
- MilitaryUnit: nationId, territoryId, type
- TechProgress: nationId, status
- GameEvent: gameRoomId, type, triggeredAt, targetNationId
- DiplomaticRelation: nationId, targetNationId

## Asymmetric Game Start

Nations can have different starting conditions:

### Starting Wealth Levels
- EXTREME_POVERTY → Minimal resources
- POOR → Limited resources
- DEVELOPING → Moderate resources
- MODERATE → Balanced resources
- WEALTHY → High resources
- SUPER_RICH → Maximum resources

### Variable Starting Attributes
- Technology level (1-10)
- Population (variable BigInt)
- Territory count
- Initial infrastructure

## Game Phases

Five-phase turn structure:
1. **ECONOMY** - Resource production and management
2. **DIPLOMACY** - Negotiations and agreements
3. **MILITARY** - Combat and troop movements
4. **TECH** - Research progress
5. **EVENTS** - Random/triggered event handling

## Performance Optimizations

✅ Database connection pooling via Prisma
✅ Query optimization with strategic indexes
✅ Redis caching for frequently accessed data
✅ Batch operations support in repositories
✅ Pagination-ready repository methods
✅ JSON fields for flexible nested data
✅ Efficient foreign key cascading

## Usage Examples

### Creating a Game Room

```typescript
const room = await gameRoomRepository.create({
  name: 'Epic Campaign',
  roomCode: 'ABC123',
  hostId: playerId,
  gameMode: GameMode.STANDARD,
  mapSize: MapSize.MEDIUM,
})
```

### Managing Redis Cache

```typescript
// Set game state
await redisService.set(
  RedisCacheKeys.gameRoomState(roomId),
  { currentTurn: 5, phase: 'ECONOMY' },
  CacheTTL.GAME_STATE
)

// Update leaderboard
await redisService.zadd(
  RedisCacheKeys.leaderboardMilitary(roomId),
  militaryPower,
  nationId
)
```

### Updating Nation Resources

```typescript
await nationRepository.updateResources(nationId, {
  food: 2000,
  wood: 1500,
  ore: 1200,
  // ... other resources
})
```

## Next Steps

With the persistence layer complete, the following can be built:
1. Game logic services (turn processing, combat, diplomacy)
2. WebSocket gateway for real-time updates
3. REST API controllers
4. Authentication/authorization
5. Game state management
6. AI opponents (if needed)

## Scripts Reference

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run migrate

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Build
npm run build
```

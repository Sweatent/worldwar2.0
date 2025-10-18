import { beforeEach, describe, expect, it } from 'vitest'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { GameStateService } from '@/modules/game/game-state.service'

describe('GameStateService', () => {
  let prisma: PrismaService
  let redis: RedisService
  let service: GameStateService
  let roomId: string

  beforeEach(async () => {
    prisma = new PrismaService()
    redis = new RedisService()
    service = new GameStateService(prisma, redis)

    const player = await prisma.player.create({
      data: { username: 'Player', email: 'player@example.com', passwordHash: 'hash', lastPlayedAt: null },
    })

    const room = await prisma.gameRoom.create({
      data: {
        roomCode: 'SNAP01',
        name: 'Snapshot Room',
        hostId: player.id,
        minPlayers: 1,
        maxPlayers: 4,
        gameMode: 'STANDARD',
        victoryThreshold: 0.8,
        mapSize: 'MEDIUM',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })
    roomId = room.id

    await prisma.nation.create({
      data: {
        gameRoomId: room.id,
        playerId: player.id,
        name: 'Snapshot Nation',
        resources: { food: 20, industry: 15, science: 10, culture: 5 },
        stability: 0.7,
        cohesion: 0.65,
        population: BigInt(500_000),
        territories: [
          {
            id: 'territory-1',
            name: 'Heartland',
            resourceYield: { food: 2, industry: 2, science: 1, culture: 1 },
          },
        ],
        units: [],
        technologies: [
          { id: 'tech-1', name: 'Logistics', status: 'COMPLETED' },
        ],
        diplomaticRelations: [],
      },
    })
  })

  it('creates, restores, and diffs snapshots', async () => {
    await service.createSnapshot(roomId, 'ECONOMY')
    const cached = await redis.get(`game:room:${roomId}:state`)
    expect(cached).toBeTruthy()
    expect(cached?.turn).toBe(1)

    const nation = await prisma.nation.findMany({ where: { gameRoomId: roomId } })
    await prisma.nation.update({
      where: { id: nation[0].id },
      data: {
        resources: { food: 25, industry: 18, science: 12, culture: 3 },
        territories: [
          ...nation[0].territories,
          {
            id: 'territory-2',
            name: 'Frontier',
            resourceYield: { food: 0, industry: 1, science: 1, culture: 0 },
          },
        ],
        diplomaticRelations: [
          { id: 'rel-1', withNationId: 'neighbor', status: 'ALLY' },
        ],
      },
    })

    await prisma.gameRoom.update({ where: { id: roomId }, data: { currentTurn: 2 } })
    await service.createSnapshot(roomId, 'MILITARY')

    const history = await service.getHistoricalSnapshots(roomId)
    expect(history).toHaveLength(2)

    const diff = await service.calculateStateDiff(roomId, 1, 2)
    expect(diff.resourceChanges[0].changes.food).toBe(5)
    expect(diff.territoryChanges[0].gained).toContain('territory-2')
    expect(diff.losses[0].losses.find((item) => item.resource === 'culture')?.value).toBeLessThan(0)
    expect(diff.gains[0].gains.find((item) => item.resource === 'food')?.value).toBeGreaterThan(0)

    const restored = await service.restoreSnapshot(roomId)
    expect(restored.turn).toBe(2)
  })
})

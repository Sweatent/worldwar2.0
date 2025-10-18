import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { GameStateService } from '@/modules/game/game-state.service'
import { TurnSchedulerService } from '@/modules/game/turn-scheduler.service'

vi.useFakeTimers()

describe('TurnSchedulerService', () => {
  let prisma: PrismaService
  let redis: RedisService
  let eventEmitter: EventEmitter2
  let gameStateService: GameStateService
  let scheduler: TurnSchedulerService

  beforeEach(() => {
    vi.clearAllTimers()
    prisma = new PrismaService()
    redis = new RedisService()
    eventEmitter = new EventEmitter2()
    gameStateService = new GameStateService(prisma, redis)
    scheduler = new TurnSchedulerService(prisma, redis, eventEmitter, gameStateService)
  })

  it('cycles through phases and advances turns', async () => {
    const playerA = await prisma.player.create({
      data: { username: 'PlayerA', email: 'a@example.com', passwordHash: 'hash', lastPlayedAt: null },
    })
    const playerB = await prisma.player.create({
      data: { username: 'PlayerB', email: 'b@example.com', passwordHash: 'hash', lastPlayedAt: null },
    })

    const room = await prisma.gameRoom.create({
      data: {
        roomCode: 'ROOM01',
        name: 'Scheduler Room',
        hostId: playerA.id,
        minPlayers: 2,
        maxPlayers: 6,
        gameMode: 'STANDARD',
        victoryThreshold: 0.8,
        mapSize: 'MEDIUM',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })

    await prisma.gameRoomPlayer.create({ data: { gameRoomId: room.id, playerId: playerA.id, isReady: true } })
    await prisma.gameRoomPlayer.create({ data: { gameRoomId: room.id, playerId: playerB.id, isReady: true } })

    await prisma.nation.create({
      data: {
        gameRoomId: room.id,
        playerId: playerA.id,
        name: 'A-Nation',
        resources: { food: 10, industry: 10, science: 10, culture: 10 },
        stability: 0.8,
        cohesion: 0.7,
        population: BigInt(1_000_000),
        territories: [
          {
            id: 'territory-a1',
            name: 'Alpha',
            resourceYield: { food: 2, industry: 1, science: 0, culture: 0 },
          },
        ],
        units: [],
        technologies: [],
        diplomaticRelations: [],
      },
    })

    await prisma.nation.create({
      data: {
        gameRoomId: room.id,
        playerId: playerB.id,
        name: 'B-Nation',
        resources: { food: 8, industry: 8, science: 8, culture: 8 },
        stability: 0.75,
        cohesion: 0.65,
        population: BigInt(900_000),
        territories: [
          {
            id: 'territory-b1',
            name: 'Beta',
            resourceYield: { food: 1, industry: 2, science: 1, culture: 0 },
          },
        ],
        units: [],
        technologies: [],
        diplomaticRelations: [],
      },
    })

    const phases: string[] = []
    const turns: number[] = []
    eventEmitter.on('game.phaseCompleted', ({ phase }) => phases.push(phase))
    eventEmitter.on('game.newTurn', ({ roomId, turn }) => {
      if (roomId === room.id) {
        turns.push(turn)
        if (turn >= 3) {
          prisma.gameRoom.update({ where: { id: roomId }, data: { status: 'COMPLETED' } })
        }
      }
    })

    await scheduler.startGameScheduler(room.id, 'STANDARD')

    const activeState = (scheduler as any).activeGames.get(room.id)
    activeState.turnDuration = 1000
    ;(activeState.playerActions as any).has = () => true
    ;(activeState.playerActions as any).keys = () => [][Symbol.iterator]()
    ;(activeState.playerActions as any).delete = () => true

    await vi.advanceTimersByTimeAsync(10_000)
    await Promise.resolve()

    expect(phases).toContain('ECONOMY')
    expect(phases).toContain('DIPLOMACY')
    expect(turns.some((turn) => turn >= 2)).toBe(true)

    const latestState = await redis.get(`game:room:${room.id}:state`)
    expect(latestState).toBeTruthy()
  })
})

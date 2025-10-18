import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GameSpeedController } from '@/modules/game/game-speed.controller'
import { RedisService } from '@/common/services/redis.service'
import { PrismaService } from '@/common/services/prisma.service'
import { BadRequestException } from '@nestjs/common'

class MockScheduler {
  updateGameSpeed = vi.fn(async () => {})
  pauseGame = vi.fn(async () => {})
  resumeGame = vi.fn(async () => {})
}

describe('GameSpeedController', () => {
  let prisma: PrismaService
  let redis: RedisService
  let scheduler: MockScheduler
  let controller: GameSpeedController
  let roomId: string

  beforeEach(async () => {
    prisma = new PrismaService()
    redis = new RedisService()
    scheduler = new MockScheduler()
    controller = new GameSpeedController(
      scheduler as unknown as any,
      redis,
      prisma,
    )

    const player = await prisma.player.create({
      data: { username: 'controller', email: 'controller@example.com', passwordHash: 'hash', lastPlayedAt: null },
    })

    const room = await prisma.gameRoom.create({
      data: {
        roomCode: 'CTRL01',
        name: 'Control Room',
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
  })

  it('updates the game speed with validation', async () => {
    const result = await controller.setGameSpeed(roomId, 4)
    expect(result.speed).toBe(4)
    expect(scheduler.updateGameSpeed).toHaveBeenCalledWith(roomId, 4)
    const storedSpeed = await redis.hget(`game:room:${roomId}:config`, 'gameSpeed')
    expect(storedSpeed).toBe(4)
  })

  it('throws on invalid speed input', async () => {
    await expect(controller.setGameSpeed(roomId, 3)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('pauses and resumes the game', async () => {
    const pauseResult = await controller.pauseGame(roomId)
    expect(pauseResult.status).toBe('PAUSED')
    expect(scheduler.pauseGame).toHaveBeenCalledWith(roomId)

    const resumeResult = await controller.resumeGame(roomId)
    expect(resumeResult.status).toBe('IN_PROGRESS')
    expect(scheduler.resumeGame).toHaveBeenCalledWith(roomId)
  })
})

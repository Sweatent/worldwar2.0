import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { GameStateService } from '@/modules/game/game-state.service'
import { TurnSchedulerService } from '@/modules/game/turn-scheduler.service'
import { RoomService } from '@/modules/room/room.service'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from '@/modules/auth/auth.service'

const createPlayer = async (authService: AuthService, username: string, email: string) => {
  const password = 'ComplexPass123!'
  const { player } = await authService.register(username, email, password)
  return player
}

describe('RoomService', () => {
  let prisma: PrismaService
  let redis: RedisService
  let eventEmitter: EventEmitter2
  let gameStateService: GameStateService
  let turnScheduler: TurnSchedulerService
  let roomService: RoomService
  let authService: AuthService

  beforeEach(() => {
    prisma = new PrismaService()
    redis = new RedisService()
    eventEmitter = new EventEmitter2()
    gameStateService = new GameStateService(prisma, redis)
    turnScheduler = new TurnSchedulerService(prisma, redis, eventEmitter, gameStateService)
    vi.spyOn(turnScheduler, 'startGameScheduler').mockImplementation(async () => {})
    roomService = new RoomService(prisma, redis, eventEmitter, gameStateService, turnScheduler)
    const jwtService = new JwtService('room-test')
    authService = new AuthService(jwtService, prisma, redis)
  })

  it('creates a room with a host automatically joined', async () => {
    const host = await createPlayer(authService, 'host', 'host@example.com')
    const room = await roomService.createRoom(host.id, { name: 'Test Room', minPlayers: 2 })

    expect(room.roomCode).toHaveLength(6)
    const roomPlayers = await prisma.getRoomPlayers(room.id)
    expect(roomPlayers).toHaveLength(1)
    expect(roomPlayers[0].playerId).toBe(host.id)

    const cachedInfo = await redis.get(`game:room:${room.id}:info`)
    expect(cachedInfo).toMatchObject({ id: room.id, status: 'WAITING' })
  })

  it('allows players to join and toggle readiness', async () => {
    const host = await createPlayer(authService, 'host2', 'host2@example.com')
    const guest = await createPlayer(authService, 'guest', 'guest@example.com')
    const room = await roomService.createRoom(host.id, { name: 'Ready Room', minPlayers: 2 })
    await roomService.joinRoom(room.id, guest.id)

    const beforeReady = await prisma.gameRoomPlayer.findFirst({ where: { gameRoomId: room.id, playerId: guest.id } })
    expect(beforeReady?.isReady).toBe(false)

    await roomService.toggleReady(room.id, guest.id)
    const afterReady = await prisma.gameRoomPlayer.findFirst({ where: { gameRoomId: room.id, playerId: guest.id } })
    expect(afterReady?.isReady).toBe(true)
  })

  it('starts the game when all players are ready and enough players', async () => {
    const host = await createPlayer(authService, 'host3', 'host3@example.com')
    const guest = await createPlayer(authService, 'guest3', 'guest3@example.com')

    const events: Array<{ roomId: string }> = []
    eventEmitter.on('game.started', (payload) => events.push(payload))

    const room = await roomService.createRoom(host.id, { name: 'Battle Room', minPlayers: 2 })
    await roomService.joinRoom(room.id, guest.id)

    await roomService.toggleReady(room.id, host.id)
    await roomService.toggleReady(room.id, guest.id)

    const result = await roomService.startGame(room.id)
    expect(result.success).toBe(true)
    expect(events).toHaveLength(1)
    expect(events[0].roomId).toBe(room.id)

    expect(turnScheduler.startGameScheduler).toHaveBeenCalledWith(room.id, 'STANDARD')

    const updatedRoom = await prisma.gameRoom.findUnique({ where: { id: room.id } })
    expect(updatedRoom?.status).toBe('IN_PROGRESS')
  })
})

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import {
  CreateRoomDto,
  GameRoomPlayer,
  Nation,
  ResourceBag,
  TurnPhase,
} from '@/common/types/game.types'
import { GameStateService } from '@/modules/game/game-state.service'
import { TurnSchedulerService } from '@/modules/game/turn-scheduler.service'

@Injectable()
export class RoomService {
  private readonly roomCodeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gameStateService: GameStateService,
    private readonly turnScheduler: TurnSchedulerService,
  ) {}

  async createRoom(hostId: string, config: CreateRoomDto) {
    const roomCode = this.generateRoomCode()
    const room = await this.prisma.gameRoom.create({
      data: {
        roomCode,
        name: config.name,
        hostId,
        minPlayers: config.minPlayers ?? 4,
        maxPlayers: config.maxPlayers ?? 6,
        gameMode: config.gameMode ?? 'STANDARD',
        victoryThreshold: config.victoryThreshold ?? 0.8,
        mapSize: config.mapSize ?? 'MEDIUM',
        status: 'WAITING',
        startedAt: null,
      } as any,
    })

    await this.cacheRoomToRedis(room.id, {
      id: room.id,
      roomCode: room.roomCode,
      status: room.status,
      currentTurn: room.currentTurn,
      gameMode: room.gameMode,
    })

    await this.joinRoom(room.id, hostId)

    return room
  }

  async joinRoom(roomId: string, playerId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: { players: true },
    })
    if (!room) throw new NotFoundException('Room not found')
    if (room.status !== 'WAITING') {
      throw new BadRequestException('Game already started')
    }

    const alreadyInRoom = room.players.some((player: GameRoomPlayer) => player.playerId === playerId)
    if (alreadyInRoom) {
      return { success: true, message: 'Player already in room' }
    }

    if (room.players.length >= room.maxPlayers) {
      throw new BadRequestException('Room is full')
    }

    await this.prisma.gameRoomPlayer.create({
      data: {
        gameRoomId: roomId,
        playerId,
        isReady: false,
      },
    })

    await this.redis.sadd(`game:room:${roomId}:players`, playerId)
    this.eventEmitter.emit('room.playerJoined', { roomId, playerId })
    return { success: true }
  }

  async toggleReady(roomId: string, playerId: string) {
    const roomPlayer = await this.prisma.gameRoomPlayer.findFirst({
      where: { gameRoomId: roomId, playerId },
    })
    if (!roomPlayer) throw new NotFoundException('Player not in room')

    const updated = await this.prisma.gameRoomPlayer.update({
      where: { id: roomPlayer.id },
      data: { isReady: !roomPlayer.isReady },
    })

    await this.checkAllPlayersReady(roomId)
    return updated
  }

  private async checkAllPlayersReady(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: { players: true },
    })
    if (!room) return

    const allReady = room.players.length > 0 && room.players.every((p: GameRoomPlayer) => p.isReady)
    const enoughPlayers = room.players.length >= room.minPlayers

    if (allReady && enoughPlayers) {
      this.eventEmitter.emit('room.readyToStart', { roomId })
    }
  }

  async startGame(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: { players: true },
    })
    if (!room) throw new NotFoundException('Room not found')
    if (room.status !== 'WAITING') {
      throw new BadRequestException('Game already started')
    }
    if (room.players.length < room.minPlayers) {
      throw new BadRequestException('Not enough players to start')
    }
    const allReady = room.players.every((p: GameRoomPlayer) => p.isReady)
    if (!allReady) {
      throw new BadRequestException('Not all players are ready')
    }

    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        currentTurn: 1,
      },
    })

    await this.initializeGameState(roomId)
    await this.turnScheduler.startGameScheduler(roomId, room.gameMode)

    this.eventEmitter.emit('game.started', { roomId })

    return { success: true, message: 'Game started' }
  }

  private async initializeGameState(roomId: string) {
    const players = await this.prisma.gameRoomPlayer.findMany({ where: { gameRoomId: roomId } })
    for (const player of players) {
      await this.createNationForPlayer(roomId, player.playerId)
    }
    await this.distributeInitialTerritories(roomId)
    await this.createGameStateSnapshot(roomId, 'ECONOMY')
  }

  private async createNationForPlayer(roomId: string, playerId: string) {
    const baseResources: ResourceBag = {
      food: 50,
      industry: 40,
      science: 20,
      culture: 10,
    }
    await this.prisma.nation.create({
      data: {
        gameRoomId: roomId,
        playerId,
        name: `Nation-${playerId.slice(0, 4)}`,
        resources: baseResources,
        stability: 0.75,
        cohesion: 0.75,
        population: BigInt(1_000_000),
        territories: [],
        technologies: [],
        units: [],
        diplomaticRelations: [],
      },
    })
  }

  private async distributeInitialTerritories(roomId: string) {
    const nations = await this.prisma.nation.findMany({ where: { gameRoomId: roomId } })
    const territoryTemplates = ['Northlands', 'Eastwatch', 'Southpoint', 'Westvale']
    let territoryIndex = 0
    for (const nation of nations) {
      const territoryName = territoryTemplates[territoryIndex % territoryTemplates.length]
      territoryIndex += 1
      nation.territories.push({
        id: `${nation.id}-territory-${territoryIndex}`,
        name: territoryName,
        resourceYield: {
          food: 5,
          industry: 4,
          science: 2,
          culture: 1,
        },
      })
      await this.prisma.nation.update({
        where: { id: nation.id },
        data: nation,
      })
    }
  }

  private async createGameStateSnapshot(roomId: string, phase: TurnPhase) {
    await this.gameStateService.createSnapshot(roomId, phase)
  }

  private generateRoomCode(): string {
    let code = ''
    for (let idx = 0; idx < 6; idx += 1) {
      const char = this.roomCodeChars.charAt(Math.floor(Math.random() * this.roomCodeChars.length))
      code += char
    }
    return code
  }

  private async cacheRoomToRedis(roomId: string, payload: Record<string, unknown>) {
    await this.redis.set(`game:room:${roomId}:info`, payload, 3600)
  }
}

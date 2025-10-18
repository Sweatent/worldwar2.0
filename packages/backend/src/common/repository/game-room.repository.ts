import { Injectable } from '@nestjs/common'
import { GameRoom, Prisma, RoomStatus } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class GameRoomRepository extends BaseRepository<GameRoom> {
  constructor(protected readonly prismaClient: PrismaService) {
    super(prismaClient)
  }

  protected getModelName(): string {
    return 'gameRoom'
  }

  async findByRoomCode(roomCode: string, options: Prisma.GameRoomFindUniqueArgs = {}): Promise<GameRoom | null> {
    return this.prismaClient.gameRoom.findUnique({
      where: { roomCode },
      ...options,
    })
  }

  async getActiveRooms(options: Prisma.GameRoomFindManyArgs = {}): Promise<GameRoom[]> {
    return this.prismaClient.gameRoom.findMany({
      where: {
        status: {
          in: [RoomStatus.WAITING, RoomStatus.STARTING, RoomStatus.IN_PROGRESS],
        },
      },
      orderBy: { createdAt: 'desc' },
      ...options,
    })
  }

  async addPlayer(gameRoomId: string, playerId: string, isReady = false) {
    return this.prismaClient.gameRoomPlayer.upsert({
      where: {
        gameRoomId_playerId: {
          gameRoomId,
          playerId,
        },
      },
      update: {
        leftAt: null,
        isReady,
      },
      create: {
        gameRoomId,
        playerId,
        isReady,
      },
    })
  }

  async removePlayer(gameRoomId: string, playerId: string) {
    return this.prismaClient.gameRoomPlayer.update({
      where: {
        gameRoomId_playerId: {
          gameRoomId,
          playerId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    })
  }

  async updateStatus(gameRoomId: string, status: RoomStatus): Promise<GameRoom> {
    return this.prismaClient.gameRoom.update({
      where: { id: gameRoomId },
      data: { status },
    })
  }

  async incrementTurn(gameRoomId: string): Promise<GameRoom> {
    return this.prismaClient.gameRoom.update({
      where: { id: gameRoomId },
      data: {
        currentTurn: { increment: 1 },
      },
    })
  }
}

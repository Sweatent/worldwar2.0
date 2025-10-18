import { Injectable } from '@nestjs/common'
import { Player } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class PlayerRepository extends BaseRepository<Player> {
  constructor(prisma: PrismaService) {
    super(prisma)
  }

  protected getModelName(): string {
    return 'player'
  }

  async findByUsername(username: string): Promise<Player | null> {
    return this.prisma.player.findUnique({
      where: { username },
    })
  }

  async findByEmail(email: string): Promise<Player | null> {
    return this.prisma.player.findUnique({
      where: { email },
    })
  }

  async incrementGamesPlayed(playerId: string): Promise<Player> {
    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        gamesPlayed: { increment: 1 },
      },
    })
  }

  async incrementGamesWon(playerId: string): Promise<Player> {
    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        gamesPlayed: { increment: 1 },
        gamesWon: { increment: 1 },
      },
    })
  }

  async updatePlayTime(playerId: string, seconds: number): Promise<Player> {
    return this.prisma.player.update({
      where: { id: playerId },
      data: {
        totalPlayTime: { increment: seconds },
        lastPlayedAt: new Date(),
      },
    })
  }
}

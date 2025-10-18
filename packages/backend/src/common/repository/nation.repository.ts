import { Injectable } from '@nestjs/common'
import { Nation, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class NationRepository extends BaseRepository<Nation> {
  constructor(protected readonly prismaClient: PrismaService) {
    super(prismaClient)
  }

  protected getModelName(): string {
    return 'nation'
  }

  async findByGameRoom(gameRoomId: string, options: Prisma.NationFindManyArgs = {}): Promise<Nation[]> {
    return this.prismaClient.nation.findMany({
      where: { gameRoomId },
      ...options,
    })
  }

  async findByPlayer(playerId: string, gameRoomId: string): Promise<Nation | null> {
    return this.prismaClient.nation.findFirst({
      where: {
        playerId,
        gameRoomId,
      },
    })
  }

  async updateResources(nationId: string, resources: any): Promise<Nation> {
    return this.prismaClient.nation.update({
      where: { id: nationId },
      data: { resources },
    })
  }

  async updateStability(nationId: string, stability: number): Promise<Nation> {
    return this.prismaClient.nation.update({
      where: { id: nationId },
      data: { stability: Math.max(0, Math.min(100, stability)) },
    })
  }

  async updateCohesion(nationId: string, cohesion: number): Promise<Nation> {
    return this.prismaClient.nation.update({
      where: { id: nationId },
      data: { cohesion: Math.max(0, Math.min(100, cohesion)) },
    })
  }

  async updatePopulation(nationId: string, population: bigint): Promise<Nation> {
    return this.prismaClient.nation.update({
      where: { id: nationId },
      data: { population },
    })
  }

  async setCapital(nationId: string, territoryId: string): Promise<Nation> {
    return this.prismaClient.nation.update({
      where: { id: nationId },
      data: { capitalId: territoryId },
    })
  }
}

import { Injectable } from '@nestjs/common'
import { TerrainType, Territory } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class TerritoryRepository extends BaseRepository<Territory> {
  constructor(protected readonly prismaClient: PrismaService) {
    super(prismaClient)
  }

  protected getModelName(): string {
    return 'territory'
  }

  async findByGameRoom(gameRoomId: string): Promise<Territory[]> {
    return this.prismaClient.territory.findMany({
      where: { gameRoomId },
      orderBy: { name: 'asc' },
    })
  }

  async findByNation(nationId: string): Promise<Territory[]> {
    return this.prismaClient.territory.findMany({
      where: { nationId },
      orderBy: { name: 'asc' },
    })
  }

  async findNeutralTerritories(gameRoomId: string): Promise<Territory[]> {
    return this.prismaClient.territory.findMany({
      where: {
        gameRoomId,
        nationId: null,
      },
    })
  }

  async findStrategicPoints(gameRoomId: string): Promise<Territory[]> {
    return this.prismaClient.territory.findMany({
      where: {
        gameRoomId,
        isStrategic: true,
      },
    })
  }

  async updateInfrastructure(territoryId: string, level: number): Promise<Territory> {
    return this.prismaClient.territory.update({
      where: { id: territoryId },
      data: { infrastructureLevel: level },
    })
  }

  async updateResourceProduction(territoryId: string, production: any): Promise<Territory> {
    return this.prismaClient.territory.update({
      where: { id: territoryId },
      data: { resourceProduction: production },
    })
  }

  async findByType(gameRoomId: string, type: TerrainType): Promise<Territory[]> {
    return this.prismaClient.territory.findMany({
      where: {
        gameRoomId,
        type,
      },
    })
  }
}

import { Injectable } from '@nestjs/common'
import { MilitaryUnit, UnitStatus, UnitType } from '@prisma/client'
import { PrismaService } from '../prisma'
import { BaseRepository } from './base.repository'

@Injectable()
export class MilitaryUnitRepository extends BaseRepository<MilitaryUnit> {
  constructor(protected readonly prismaClient: PrismaService) {
    super(prismaClient)
  }

  protected getModelName(): string {
    return 'militaryUnit'
  }

  async findByNation(nationId: string): Promise<MilitaryUnit[]> {
    return this.prismaClient.militaryUnit.findMany({
      where: { nationId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findByTerritory(territoryId: string): Promise<MilitaryUnit[]> {
    return this.prismaClient.militaryUnit.findMany({
      where: { territoryId },
    })
  }

  async findByType(nationId: string, type: UnitType): Promise<MilitaryUnit[]> {
    return this.prismaClient.militaryUnit.findMany({
      where: {
        nationId,
        type,
      },
    })
  }

  async updateStatus(unitId: string, status: UnitStatus): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { status },
    })
  }

  async updateMorale(unitId: string, morale: number): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { morale: Math.max(0, Math.min(100, morale)) },
    })
  }

  async updateStrength(unitId: string, strength: number): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { strength: Math.max(0, Math.min(100, strength)) },
    })
  }

  async addExperience(unitId: string, experience: number): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { experience: { increment: experience } },
    })
  }

  async moveUnit(unitId: string, territoryId: string, movementLeft: number): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: {
        territoryId,
        movement: movementLeft,
        status: UnitStatus.MOVING,
      },
    })
  }

  async assignGeneral(unitId: string, generalId: string): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { generalId },
    })
  }

  async updateSupply(unitId: string, supply: number): Promise<MilitaryUnit> {
    return this.prismaClient.militaryUnit.update({
      where: { id: unitId },
      data: { supply: Math.max(0, Math.min(100, supply)) },
    })
  }
}

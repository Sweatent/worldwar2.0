// Guerrilla Warfare Service
// Provides sabotage mechanics targeting supply, infrastructure, and morale

class BadRequestException extends Error {}
function Injectable(): ClassDecorator { return () => {} }

@Injectable()
export class GuerrillaWarfareService {
  private prisma: any
  private eventEmitter: any = { emit: (_evt: string, _payload: any) => {} }

  constructor(prisma?: any, eventEmitter?: any) {
    this.prisma = prisma
    if (eventEmitter) this.eventEmitter = eventEmitter
  }

  // 游击战破坏行动
  async executeSabotage(unitId: string, targetId: string, type: 'SUPPLY' | 'INFRASTRUCTURE' | 'MORALE') {
    const unit = await this.prisma?.militaryUnit?.findUnique?.({ where: { id: unitId } })

    if (!unit || unit.type !== 'GUERRILLA') {
      throw new BadRequestException('Only guerrilla units can sabotage')
    }

    const successChance = 0.6 // 60%基础成功率

    if (Math.random() < successChance) {
      switch (type) {
        case 'SUPPLY':
          await this.damageSupplyLine(targetId)
          break
        case 'INFRASTRUCTURE':
          await this.damageInfrastructure(targetId)
          break
        case 'MORALE':
          await this.inciteRebellion(targetId)
          break
      }

      this.eventEmitter?.emit('guerrilla:success', {
        unitId,
        type,
        message: '游击队成功完成破坏任务！',
        showCovertAnimation: true,
      })
    } else {
      this.eventEmitter?.emit('guerrilla:failed', {
        unitId,
        type,
        message: '破坏行动失败，游击队被迫撤退。',
      })
    }
  }

  // Implementations for sabotage effects
  private async damageSupplyLine(targetTerritoryId: string) {
    // Reduce supply for all enemy units in/around the territory
    try {
      const units = await this.prisma?.militaryUnit?.findMany?.({ where: { territoryId: targetTerritoryId } })
      for (const u of units || []) {
        await this.prisma?.militaryUnit?.update?.({
          where: { id: u.id },
          data: { supply: Math.max(0, (u.supply ?? 0) - 30) },
        })
      }
    } catch {}
  }

  private async damageInfrastructure(targetTerritoryId: string) {
    try {
      const territory = await this.prisma?.territory?.findUnique?.({ where: { id: targetTerritoryId }, include: { buildings: true } })
      if (!territory) return
      // Randomly disable one infrastructure building if exists
      const infra = (territory.buildings || []).find((b: any) => ['FACTORY', 'RAILWAY', 'ROAD', 'PORT', 'SUPPLY_DEPOT', 'POWER_PLANT'].includes(b.type))
      if (infra) {
        await this.prisma?.building?.update?.({
          where: { id: infra.id },
          data: { isOperational: false, damage: Math.min(100, (infra.damage ?? 0) + 50) },
        })
      }
    } catch {}
  }

  private async inciteRebellion(targetNationId: string) {
    try {
      const nation = await this.prisma?.nation?.findUnique?.({ where: { id: targetNationId } })
      if (!nation) return
      await this.prisma?.nation?.update?.({
        where: { id: targetNationId },
        data: { stability: Math.max(0, (nation.stability ?? 100) - 10) },
      })
    } catch {}
  }
}

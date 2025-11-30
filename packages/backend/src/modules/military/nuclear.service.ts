// Nuclear Weapons Service
// Provides nuclear strike capability with diplomatic and visual feedback

class BadRequestException extends Error {}
function Injectable(): ClassDecorator { return () => {} }

@Injectable()
export class NuclearWeaponsService {
  private prisma: any
  private gateway: any = { server: { emit: (_evt: string, _payload: any) => {} } }

  constructor(prisma?: any, gateway?: any) {
    this.prisma = prisma
    if (gateway) this.gateway = gateway
  }

  // 发射核武器（心理学机制：终极权力按钮）
  async launchNuclearStrike(nationId: string, targetTerritoryId: string) {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })

    if (!nation) throw new BadRequestException('Nation not found')

    const hasNukes = await this.hasNuclearWeapons(nationId)
    if (!hasNukes) {
      throw new BadRequestException('No nuclear weapons available')
    }

    // 前端需要双重确认：逻辑由前端进行，这里假定已确认

    await this.executeNuclearStrike(targetTerritoryId)
    await this.applyDiplomaticPenalty(nationId)

    this.gateway?.server?.emit('nuclear:strike', {
      territoryId: targetTerritoryId,
      attackerId: nationId,
      showEpicAnimation: true,
      playDramaticSound: true,
      message: '☢️ 核武器已发射！',
    })
  }

  private async hasNuclearWeapons(nationId: string): Promise<boolean> {
    try {
      const stock = await this.prisma?.strategicAsset?.findFirst?.({ where: { nationId, type: 'NUCLEAR_MISSILE', quantity: { gt: 0 } } })
      return Boolean(stock)
    } catch {
      return false
    }
  }

  private async executeNuclearStrike(targetTerritoryId: string) {
    try {
      // Massive damage to units and infrastructure in the target territory
      const units = await this.prisma?.militaryUnit?.findMany?.({ where: { territoryId: targetTerritoryId } })
      for (const u of units || []) {
        await this.prisma?.militaryUnit?.update?.({ where: { id: u.id }, data: { quantity: 0 } })
      }
      const buildings = await this.prisma?.building?.findMany?.({ where: { territoryId: targetTerritoryId } })
      for (const b of buildings || []) {
        await this.prisma?.building?.update?.({ where: { id: b.id }, data: { isOperational: false, damage: 100 } })
      }
      await this.prisma?.territory?.update?.({ where: { id: targetTerritoryId }, data: { radiation: 100, isDevastated: true } })
    } catch {}
  }

  private async applyDiplomaticPenalty(nationId: string) {
    try {
      const nations = await this.prisma?.nation?.findMany?.({ where: { id: { not: nationId } } })
      for (const n of nations || []) {
        await this.prisma?.diplomacy?.upsert?.({
          where: { pair: { aId: nationId, bId: n.id } },
          update: { opinion: Math.max(-100, (n.opinion ?? 0) - 50) },
          create: { aId: nationId, bId: n.id, opinion: -50 },
        })
      }
    } catch {}
  }
}

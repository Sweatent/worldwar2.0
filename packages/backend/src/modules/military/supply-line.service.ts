// Supply Line Service
// Self-contained with minimal stubs for external services

import type { Territory } from './combat-simulator.service'

function Injectable(): ClassDecorator { return () => {} }

@Injectable()
export class SupplyLineService {
  private prisma: any
  private gateway: any = {
    server: { to: (_id: string) => ({ emit: (_evt: string, _payload: any) => {} }) },
  }

  constructor(prisma?: any, gateway?: any) {
    this.prisma = prisma
    if (gateway) this.gateway = gateway
  }

  // 计算补给状态
  async calculateSupplyStatus(unitId: string): Promise<number> {
    const unit = await this.prisma?.militaryUnit?.findUnique?.({
      where: { id: unitId },
      include: {
        territory: true,
        nation: {
          include: { territories: { include: { buildings: true } } },
        },
      },
    })

    if (!unit) return 0

    const hasSupplyLine = await this.checkSupplyLine(
      unit.territory,
      unit.nation?.territories ?? []
    )

    if (!hasSupplyLine) {
      const currentSupply: number = Math.max(0, (unit.supply ?? 0) - 20)
      try {
        await this.prisma?.militaryUnit?.update?.({
          where: { id: unitId },
          data: {
            supply: currentSupply,
            morale: Math.max(0, (unit.morale ?? 0) - 10),
          },
        })
      } catch {}

      if (currentSupply < 30) {
        try {
          this.gateway?.server?.to(unit.nation?.playerId ?? '')?.emit('supply:critical', {
            unitId: unit.id,
            currentSupply,
            message: '⚠️ 补给线被切断！部队战斗力严重下降！',
            showUrgentWarning: true,
          })
        } catch {}
      }

      return currentSupply
    }

    const newSupply = Math.min(100, (unit.supply ?? 0) + 10)
    try {
      await this.prisma?.militaryUnit?.update?.({ where: { id: unitId }, data: { supply: newSupply } })
    } catch {}
    return newSupply
  }

  // 检查补给线（使用路径算法）
  private async checkSupplyLine(
    currentTerritory: Territory,
    ownedTerritories: Territory[]
  ): Promise<boolean> {
    if (!currentTerritory || !ownedTerritories?.length) return false

    const supplySources = (ownedTerritories || []).filter((t: any) =>
      Boolean(t?.isCapital) || Boolean(t?.hasPort) || Array.isArray(t?.buildings) && t.buildings.some((b: any) => b?.type === 'SUPPLY_DEPOT')
    )

    if (supplySources.length === 0) return false

    return this.hasPathToSupplySource(currentTerritory, supplySources, ownedTerritories)
  }

  private getAdjacencyIds(t: any): string[] {
    if (!t) return []
    if (Array.isArray(t.adjacentTerritoryIds)) return t.adjacentTerritoryIds
    if (Array.isArray(t.neighbors)) return t.neighbors
    if (Array.isArray(t.connections)) return t.connections
    return []
  }

  private hasPathToSupplySource(current: Territory, sources: Territory[], owned: Territory[]): boolean {
    const ownedSet = new Set((owned || []).map(t => t.id))
    const sourceSet = new Set((sources || []).map(t => t.id))

    const visited = new Set<string>()
    const queue: string[] = [current.id]
    visited.add(current.id)

    while (queue.length) {
      const id = queue.shift()!
      if (sourceSet.has(id)) return true
      const terr = (owned || []).find(t => t.id === id)
      if (!terr) continue
      const neighbors = this.getAdjacencyIds(terr)
      for (const nId of neighbors) {
        if (!ownedSet.has(nId)) continue
        if (visited.has(nId)) continue
        visited.add(nId)
        queue.push(nId)
      }
    }

    return false
  }
}

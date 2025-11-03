// Core economy simulation - Resource Production Service
// Self-contained module without external dependencies

// No-op decorators to mirror NestJS API without importing it
function Injectable(): ClassDecorator { return () => {}; }

// Types
export type TerrainType = 'PLAINS' | 'MOUNTAINS' | 'FOREST' | 'DESERT' | 'COASTAL' | string

export interface Resources {
  food: number
  wood: number
  ore: number
  rareMetals: number
  oil: number
  energy: number
  money: number
  manpower: number
  [key: string]: number
}

export interface NationLike {
  id: string
  startingWealth?: 'EXTREME_POVERTY' | 'POOR' | 'DEVELOPING' | 'MODERATE' | 'WEALTHY' | 'SUPER_RICH' | string
  technologies?: string[]
}

export interface BuildingLike {
  type: string
  level?: number
  status?: 'UNDER_CONSTRUCTION' | 'ACTIVE'
}

export interface TerritoryLike {
  id: string
  name?: string
  type: TerrainType
  size: number
  infrastructureLevel: number
  nationId: string
  nation: NationLike
  buildings: BuildingLike[]
}

@Injectable()
export class ResourceProductionService {
  constructor(
    private prisma?: any,
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 计算领土资源产出（每回合）
  async calculateTerritoryProduction(territoryId: string): Promise<Resources> {
    let territory: TerritoryLike

    if (this.prisma?.territory?.findUnique) {
      territory = await this.prisma.territory.findUnique({
        where: { id: territoryId },
        include: { nation: true, buildings: true },
      })
    } else {
      throw new Error('Prisma client not provided to ResourceProductionService')
    }

    const baseProduction = this.getBaseProduction(territory.type, territory.size)

    const buildingBonus = this.calculateBuildingBonus(territory.buildings)

    const infraBonus = 1 + territory.infrastructureLevel * 0.1

    const techBonus = await this.getTechnologyBonus(territory.nation)

    const povertyPenalty = this.getPovertyPenalty(territory.nation)

    const production: any = {}
    for (const [resource, baseAmount] of Object.entries(baseProduction)) {
      const b = buildingBonus[resource] ?? 1
      const t = techBonus[resource] ?? 1
      production[resource] = Math.max(
        0,
        Math.floor((baseAmount as number) * b * infraBonus * t * povertyPenalty),
      )
    }

    // Fill missing resources with zero to satisfy Resources shape
    const completed: Resources = {
      food: production.food ?? 0,
      wood: production.wood ?? 0,
      ore: production.ore ?? 0,
      rareMetals: production.rareMetals ?? 0,
      oil: production.oil ?? 0,
      energy: production.energy ?? 0,
      money: production.money ?? 0,
      manpower: production.manpower ?? 0,
    }

    // 可选：广播本回合产出结果，便于“实时可视化”
    this.eventEmitter?.emit?.('economy:territoryProduction', {
      territoryId,
      production: completed,
    })

    return completed
  }

  // 获取基础产出（根据地形）
  private getBaseProduction(type: TerrainType, size: number): Partial<Resources> {
    const baseRates: Record<string, Partial<Resources>> = {
      PLAINS: { food: 100, wood: 20, ore: 10 },
      MOUNTAINS: { ore: 80, rareMetals: 5, wood: 10 },
      FOREST: { wood: 100, food: 30 },
      DESERT: { ore: 40, oil: 20 },
      COASTAL: { food: 60, oil: 30 },
    }

    const base = baseRates[type] || { food: 50, wood: 20, ore: 20 }

    const scaled = Object.fromEntries(
      Object.entries(base).map(([k, v]) => [k, (v as number) * Math.max(1, size)]),
    )

    return scaled
  }

  // 建筑加成：将建筑的 effects 映射为各资源的乘数（例如 +50 => x1.5）
  private calculateBuildingBonus(buildings: BuildingLike[]): Record<string, number> {
    const bonus: Record<string, number> = {}

    for (const b of buildings || []) {
      if (b.status && b.status !== 'ACTIVE') continue
      const def = BUILDING_DEFINITIONS[b.type as keyof typeof BUILDING_DEFINITIONS]
      if (!def?.effects) continue
      const level = Math.max(1, b.level || 1)
      for (const [k, v] of Object.entries(def.effects)) {
        if (k.endsWith('Production')) {
          // k 形如 foodProduction/oreProduction 等
          const resource = k.replace('Production', '')
          const addPct = Number(v) // 例如 +50
          const mult = 1 + (addPct / 100) * level
          bonus[resource] = (bonus[resource] || 1) * mult
        } else if (k.endsWith('Efficiency')) {
          const resource = 'money' // 以货币效率变相加成收益
          const addPct = Number(v)
          const mult = 1 + (addPct / 100) * level
          bonus[resource] = (bonus[resource] || 1) * mult
        }
      }
    }

    return bonus
  }

  // 科技加成：根据已完成科技提供各资源乘数
  private async getTechnologyBonus(nation: NationLike): Promise<Record<string, number>> {
    const techs = nation?.technologies || (await this.readNationTechs(nation?.id))
    const map: Record<string, number> = {}

    for (const tech of techs || []) {
      switch (tech) {
        case 'TECH_MINING_1':
          map.ore = (map.ore || 1) * 1.1
          map.rareMetals = (map.rareMetals || 1) * 1.05
          break
        case 'TECH_AGRICULTURE_1':
          map.food = (map.food || 1) * 1.15
          break
        case 'TECH_ELECTRICITY':
          map.energy = (map.energy || 1) * 1.2
          break
        case 'TECH_OIL_REFINING':
          map.oil = (map.oil || 1) * 1.2
          break
        default:
          break
      }
    }

    return map
  }

  private async readNationTechs(nationId?: string): Promise<string[]> {
    if (!nationId || !this.prisma?.nationTechnology) return []
    const rows = await this.prisma.nationTechnology.findMany({ where: { nationId, completed: true } })
    return rows.map((r: any) => r.techKey)
  }

  // 贫困地区惩罚（心理学机制：突出困难）
  private getPovertyPenalty(nation: NationLike): number {
    switch (nation?.startingWealth) {
      case 'EXTREME_POVERTY':
        return 0.5
      case 'POOR':
        return 0.7
      case 'DEVELOPING':
        return 0.85
      case 'MODERATE':
        return 1.0
      case 'WEALTHY':
        return 1.15
      case 'SUPER_RICH':
        return 1.3
      default:
        return 1.0
    }
  }
}

// 简化版建筑定义（与 BuildingService 中保持基本一致以便计算加成）
const BUILDING_DEFINITIONS = {
  FARM: {
    name: '农场',
    effects: { foodProduction: +50 },
  },
  MINE: {
    name: '矿场',
    effects: { oreProduction: +80, rareMetalsProduction: +5 },
  },
  FACTORY: {
    name: '工厂',
    effects: { productionEfficiency: +20 },
  },
  POWER_PLANT: {
    name: '发电厂',
    effects: { energyProduction: +200 },
  },
  OIL_REFINERY: {
    name: '炼油厂',
    effects: { oilProduction: +100 },
  },
} as const

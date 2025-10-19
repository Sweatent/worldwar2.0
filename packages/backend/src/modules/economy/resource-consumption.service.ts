// Core economy simulation - Resource Consumption Service

function Injectable(): ClassDecorator { return () => {}; }

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

export interface UnitLike {
  id: string
  type: keyof typeof UNIT_MAINTENANCE_COSTS | string
  quantity: number
}

export interface BuildingLike {
  id: string
  type: string
}

@Injectable()
export class ResourceConsumptionService {
  constructor(
    private prisma?: any,
  ) {}

  // 计算国家每回合消耗
  async calculateNationConsumption(nationId: string): Promise<Resources> {
    if (!this.prisma?.nation?.findUnique) throw new Error('Prisma client not provided')

    const nation = await this.prisma.nation.findUnique({
      where: { id: nationId },
      include: { territories: true, units: true, buildings: true },
    })

    const consumption: Resources = {
      food: 0,
      wood: 0,
      ore: 0,
      energy: 0,
      oil: 0,
      money: 0,
      manpower: 0,
      rareMetals: 0,
    }

    // 1. 人口消耗
    const populationConsumption = this.calculatePopulationConsumption(nation.population)
    this.addConsumption(consumption, populationConsumption)

    // 2. 军队消耗（心理学机制：庞大军队拖累经济）
    const militaryConsumption = this.calculateMilitaryConsumption(nation.units || [])
    this.addConsumption(consumption, militaryConsumption)

    // 3. 建筑维护
    const maintenanceCost = this.calculateMaintenanceCost(nation.buildings || [])
    this.addConsumption(consumption, maintenanceCost)

    // 4. 科技研发消耗
    const researchCost = await this.calculateResearchCost(nationId)
    this.addConsumption(consumption, researchCost)

    return consumption
  }

  // 工具：合并消耗对象
  private addConsumption(target: Partial<Resources>, inc: Partial<Resources>) {
    for (const [k, v] of Object.entries(inc)) {
      target[k] = (target[k] || 0) + (v as number)
    }
  }

  // 人口消耗
  private calculatePopulationConsumption(population: bigint | number): Partial<Resources> {
    const popNum = typeof population === 'bigint' ? Number(population) : population
    return {
      food: Math.floor(popNum / 100), // 每100人需要1单位食物
      energy: Math.floor(popNum / 500),
    }
  }

  // 军队消耗（不同单位消耗不同）
  private calculateMilitaryConsumption(units: UnitLike[]): Partial<Resources> {
    const consumption: Partial<Resources> = { food: 0, energy: 0, oil: 0, money: 0 }

    for (const unit of units) {
      const unitCost = UNIT_MAINTENANCE_COSTS[unit.type as keyof typeof UNIT_MAINTENANCE_COSTS]
      if (!unitCost) continue
      consumption.food = (consumption.food || 0) + unitCost.food * unit.quantity
      consumption.energy = (consumption.energy || 0) + unitCost.energy * unit.quantity
      consumption.oil = (consumption.oil || 0) + unitCost.oil * unit.quantity
      consumption.money = (consumption.money || 0) + unitCost.money * unit.quantity
    }

    return consumption
  }

  // 建筑维护成本：按建造成本的比例估算（简化）
  private calculateMaintenanceCost(buildings: BuildingLike[]): Partial<Resources> {
    const cost: Partial<Resources> = { money: 0, energy: 0 }
    for (const b of buildings) {
      const def = BUILDING_DEFINITIONS[b.type as keyof typeof BUILDING_DEFINITIONS]
      if (!def) continue
      const moneyMaintenance = Math.floor((def.cost?.money || 0) * 0.02)
      const energyMaintenance = Math.floor((def.effects?.energyProduction || 0) * 0.05)
      cost.money = (cost.money || 0) + moneyMaintenance
      cost.energy = (cost.energy || 0) + energyMaintenance
    }
    return cost
  }

  // 科研消耗（根据正在进行的项目数量与优先级估算）
  private async calculateResearchCost(nationId: string): Promise<Partial<Resources>> {
    if (!this.prisma?.researchProject?.findMany) {
      // 没有科研系统时，返回基础值
      return { money: 0, energy: 0 }
    }
    const projects = await this.prisma.researchProject.findMany({ where: { nationId, status: 'ACTIVE' } })
    const count = projects.length
    return {
      money: 100 * count,
      energy: 20 * count,
    }
  }
}

// 单位维护成本配置
export const UNIT_MAINTENANCE_COSTS: Record<string, { food: number; energy: number; oil: number; money: number }> = {
  MILITIA: { food: 1, energy: 0, oil: 0, money: 5 },
  INFANTRY: { food: 2, energy: 1, oil: 0, money: 10 },
  LIGHT_TANK: { food: 0, energy: 5, oil: 10, money: 50 },
  HEAVY_TANK: { food: 0, energy: 10, oil: 20, money: 100 },
  FIGHTER: { food: 0, energy: 15, oil: 50, money: 200 },
}

// 复用建筑定义以估算维护
const BUILDING_DEFINITIONS = {
  FARM: {
    name: '农场',
    cost: { money: 500, wood: 200 },
    buildTime: 2,
    effects: { foodProduction: +50 },
    prerequisites: [],
  },
  MINE: {
    name: '矿场',
    cost: { money: 800, wood: 300, ore: 100 },
    buildTime: 3,
    effects: { oreProduction: +80, rareMetalsProduction: +5 },
    prerequisites: ['TECH_MINING_1'],
  },
  FACTORY: {
    name: '工厂',
    cost: { money: 2000, wood: 500, ore: 500 },
    buildTime: 5,
    effects: { productionEfficiency: +20 },
    prerequisites: ['TECH_INDUSTRIALIZATION'],
  },
  POWER_PLANT: {
    name: '发电厂',
    cost: { money: 3000, ore: 1000 },
    buildTime: 6,
    effects: { energyProduction: +200 },
    prerequisites: ['TECH_ELECTRICITY'],
  },
  OIL_REFINERY: {
    name: '炼油厂',
    cost: { money: 5000, ore: 1500 },
    buildTime: 8,
    effects: { oilProduction: +100 },
    prerequisites: ['TECH_OIL_REFINING'],
  },
} as const

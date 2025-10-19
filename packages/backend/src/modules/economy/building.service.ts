// Core economy simulation - Building Service

function Injectable(): ClassDecorator { return () => {}; }
function Cron(_expression: string): MethodDecorator { return () => {}; }
class BadRequestException extends Error {}

export type BuildingType = keyof typeof BUILDING_DEFINITIONS | string

@Injectable()
export class BuildingService {
  constructor(
    private prisma?: any,
    private economyService?: { checkResources: (nationId: string, cost: any) => Promise<void>; deductResources: (nationId: string, cost: any) => Promise<void> },
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 建造建筑
  async constructBuilding(territoryId: string, buildingType: BuildingType) {
    if (!this.prisma?.territory?.findUnique) throw new Error('Prisma client not provided')

    const territory = await this.prisma.territory.findUnique({
      where: { id: territoryId },
      include: { nation: { include: { gameRoom: true } }, buildings: true },
    })

    const existing = (territory.buildings || []).find((b: any) => b.type === buildingType)
    if (existing) {
      throw new BadRequestException('该领土已有此类建筑')
    }

    const buildingDef = BUILDING_DEFINITIONS[buildingType as keyof typeof BUILDING_DEFINITIONS]
    if (!buildingDef) throw new BadRequestException('未知的建筑类型')

    await this.checkPrerequisites(territory.nation, buildingDef.prerequisites || [])

    if (!this.economyService) throw new Error('Economy service not provided')
    await this.economyService.checkResources(territory.nationId, buildingDef.cost || {})
    await this.economyService.deductResources(territory.nationId, buildingDef.cost || {})

    const completionTurn = (territory.nation?.gameRoom?.currentTurn || 0) + (buildingDef.buildTime || 0)

    const building = await this.prisma.building.create({
      data: {
        territoryId,
        type: buildingType,
        level: 1,
        status: 'UNDER_CONSTRUCTION',
        completionTurn,
      },
    })

    this.eventEmitter?.emit?.('building:started', {
      buildingId: building.id,
      type: buildingType,
      completionTurn,
    })

    return building
  }

  // 建筑完成检查（每回合）
  @Cron('*/10 * * * * *') // 每10秒检查一次
  async checkBuildingCompletion() {
    if (!this.prisma?.building?.findMany) return

    const buildings = await this.prisma.building.findMany({
      where: { status: 'UNDER_CONSTRUCTION' },
      include: { territory: { include: { nation: { include: { gameRoom: true } } } } },
    })

    for (const building of buildings) {
      const currentTurn = building.territory.nation.gameRoom.currentTurn
      if (currentTurn >= building.completionTurn) {
        await this.prisma.building.update({ where: { id: building.id }, data: { status: 'ACTIVE' } })
        this.eventEmitter?.emit?.('building:completed', {
          buildingId: building.id,
          nationId: building.territory.nationId,
          showMajorCelebration: true,
        })
      }
    }
  }

  private async checkPrerequisites(nation: any, prerequisites: string[] = []) {
    if (!prerequisites?.length) return

    const completedTechs: string[] = nation?.technologies || (await this.readNationTechs(nation?.id))
    for (const pre of prerequisites) {
      if (!completedTechs.includes(pre)) {
        throw new BadRequestException(`缺少前置科技：${pre}`)
      }
    }
  }

  private async readNationTechs(nationId?: string): Promise<string[]> {
    if (!nationId || !this.prisma?.nationTechnology) return []
    const rows = await this.prisma.nationTechnology.findMany({ where: { nationId, completed: true } })
    return rows.map((r: any) => r.techKey)
  }
}

// 建筑定义
export const BUILDING_DEFINITIONS = {
  FARM: {
    name: '农场',
    cost: { money: 500, wood: 200 },
    buildTime: 2, // 回合
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

// Core economy simulation - Poverty Mechanics Service

function Injectable(): ClassDecorator { return () => {}; }

export interface Resources { [key: string]: number }

@Injectable()
export class PovertyMechanicsService {
  constructor(
    private prisma?: any,
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 潜力机制：未开发资源勘探（兼容中文方法名）
  async 探索UndiscoveredResources(territoryId: string) {
    return this.exploreUndiscoveredResources(territoryId)
  }

  // 潜力机制：未开发资源勘探
  async exploreUndiscoveredResources(territoryId: string) {
    if (!this.prisma?.territory?.findUnique) throw new Error('Prisma client not provided')

    const territory = await this.prisma.territory.findUnique({ where: { id: territoryId } })

    const nation = await this.prisma.nation.findUnique({ where: { id: territory.nationId } })

    const discoveryChance = nation.startingWealth === 'EXTREME_POVERTY' ? 0.15 : 0.05

    if (Math.random() < discoveryChance) {
      const resourceType = this.randomResourceType()
      const amount = Math.floor(Math.random() * 1000) + 500

      const production = ({ ...(territory.resourceProduction || {}) } as any)
      production[resourceType] = (production[resourceType] || 0) + amount

      await this.prisma.territory.update({ where: { id: territoryId }, data: { resourceProduction: production } })

      this.eventEmitter?.emit?.('resources:discovered', {
        territoryId,
        resourceType,
        amount,
        showEpicAnimation: true,
        message: `在${territory.name || ''}发现了丰富的${resourceType}矿藏！`,
      })
    }
  }

  // 逆境增益机制
  async checkAdversityBonus(nationId: string) {
    if (!this.prisma?.nation?.findUnique) throw new Error('Prisma client not provided')

    const nation = await this.prisma.nation.findUnique({ where: { id: nationId } })

    const resources = (nation.resources || {}) as Resources
    const isInAdversity = (resources.food || 0) < 100 || (resources.energy || 0) < 50 || (nation.stability || 0) < 30

    if (isInAdversity) {
      await this.activateAdversityBonus(nationId)
    }
  }

  private async activateAdversityBonus(nationId: string) {
    await this.prisma?.nationBuff?.create?.({
      data: {
        nationId,
        type: 'ADVERSITY_BONUS',
        effects: {
          defensiveBonus: +15,
          researchBurst: +25,
          cohesion: +20,
        },
        duration: 3,
      },
    })

    this.eventEmitter?.emit?.('adversity:activated', {
      nationId,
      message: '在绝境中，人民空前团结！',
      showDramaticEffect: true,
    })
  }

  private randomResourceType(): string {
    const types = ['food', 'wood', 'ore', 'rareMetals', 'oil', 'energy']
    return types[Math.floor(Math.random() * types.length)]
  }
}

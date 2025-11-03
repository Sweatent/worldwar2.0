// Core economy simulation - Development Path Service

function Injectable(): ClassDecorator { return () => {}; }

export type DevelopmentPath = keyof typeof DEVELOPMENT_PATH_EFFECTS | string

@Injectable()
export class DevelopmentPathService {
  constructor(
    private prisma?: any,
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 选择发展路径
  async chooseDevelopmentPath(nationId: string, path: DevelopmentPath) {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })
    if (!nation) throw new Error('Nation not found')

    const effects = DEVELOPMENT_PATH_EFFECTS[path as keyof typeof DEVELOPMENT_PATH_EFFECTS]
    if (!effects) throw new Error('Invalid development path')

    await this.prisma?.nationDevelopment?.upsert?.({
      where: { nationId },
      create: { nationId, path, bonuses: effects.bonuses, penalties: effects.penalties },
      update: { path, bonuses: effects.bonuses, penalties: effects.penalties },
    })

    this.eventEmitter?.emit?.('development:pathChosen', {
      nationId,
      path,
      effects,
      showMajorAnnouncement: true,
    })
  }
}

// 发展路径效果
export const DEVELOPMENT_PATH_EFFECTS = {
  INWARD_DEVELOPMENT: {
    name: '内向发展',
    description: '优先满足基础需求，投资教育、基础设施',
    bonuses: {
      stabilityGrowth: +20,
      infrastructureCost: -25,
      educationSpeed: +30,
    },
    penalties: {
      economicGrowth: -10,
      diplomaticInfluence: -15,
    },
  },
  EXPORT_ORIENTED: {
    name: '外向型经济',
    description: '利用廉价劳动力发展轻工业/资源出口',
    bonuses: {
      tradeIncome: +50,
      foreignInvestment: +40,
      economicGrowth: +30,
    },
    penalties: {
      stability: -10,
      economicVulnerability: +30,
    },
  },
  MILITARY_ECONOMY: {
    name: '军事经济',
    description: '牺牲民生，全力投入军工生产',
    bonuses: {
      militaryProduction: +60,
      unitCost: -30,
      warReadiness: +40,
    },
    penalties: {
      stability: -25,
      civilianGoodsProduction: -40,
      diplomaticReputation: -20,
    },
  },
  TECH_DRIVEN: {
    name: '科技驱动',
    description: '集中资源突破关键技术，"弯道超车"',
    bonuses: {
      researchSpeed: +50,
      techBreakthroughChance: +30,
      innovationPoints: +40,
    },
    penalties: {
      militaryReadiness: -20,
      economicGrowth: -15,
      requiresStability: 70,
    },
  },
} as const

// General (Commander) system service
// Self-contained with minimal stubs and a simple trait system

function Injectable(): ClassDecorator { return () => {} }
function Cron(_expr: string): MethodDecorator { return () => {} }

export interface General {
  id: string
  nationId: string
  name: string
  portrait?: string
  attack: number
  defense: number
  planning: number
  logistics: number
  traits: string[]
  loyalty: number
  isAlive?: boolean
  units?: any[]
  nation?: any
}

@Injectable()
export class GeneralService {
  private prisma: any
  private eventEmitter: any = { emit: (_evt: string, _payload: any) => {} }

  constructor(prisma?: any, eventEmitter?: any) {
    this.prisma = prisma
    if (eventEmitter) this.eventEmitter = eventEmitter
  }

  // 招募将领
  async recruitGeneral(nationId: string): Promise<General> {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })
    if (!nation) throw new Error('Nation not found')

    const cost = { money: 5000, influence: 50 }
    await this.checkResources(nationId, cost)

    const general = await this.prisma?.general?.create?.({
      data: {
        nationId,
        name: this.generateGeneralName(),
        portrait: this.selectRandomPortrait(),
        attack: Math.floor(Math.random() * 5) + 5,
        defense: Math.floor(Math.random() * 5) + 5,
        planning: Math.floor(Math.random() * 5) + 5,
        logistics: Math.floor(Math.random() * 5) + 5,
        traits: this.selectRandomTraits(),
        loyalty: 100,
      },
    })

    return general
  }

  // 将领特质效果
  private GENERAL_TRAITS: Record<string, { name: string; effects: Record<string, number> }> = {
    AGGRESSIVE: {
      name: '进攻型',
      effects: { attackBonus: +20, defenseBonus: -10 },
    },
    DEFENSIVE_MASTER: {
      name: '防守大师',
      effects: { defenseBonus: +30, attackBonus: -5 },
    },
    GUERRILLA_EXPERT: {
      name: '游击战专家',
      effects: { guerrillaEfficiency: +50, terrainBonus: +20 },
    },
    LOGISTICIAN: {
      name: '后勤专家',
      effects: { supplyEfficiency: +30, movementSpeed: +15 },
    },
    INSPIRING: {
      name: '鼓舞人心',
      effects: { moraleBonus: +20, loyaltyGrowth: +10 },
    },
  }

  // 每天检查忠诚度
  @Cron('0 0 * * *')
  async checkGeneralLoyalty() {
    const generals: General[] = await this.prisma?.general?.findMany?.({ include: { nation: true } })

    for (const general of generals || []) {
      if (general.nation?.stability < 30) {
        general.loyalty = Math.max(0, (general.loyalty ?? 0) - 5)
      }

      const recentVictories = await this.getRecentVictories(general.id)
      if (recentVictories === 0) {
        general.loyalty = Math.max(0, (general.loyalty ?? 0) - 3)
      }

      if ((general.loyalty ?? 0) < 20) {
        const defectChance = (20 - (general.loyalty ?? 0)) / 100
        if (Math.random() < defectChance) {
          await this.generalDefects(general.id)
        }
      }

      await this.prisma?.general?.update?.({ where: { id: general.id }, data: { loyalty: general.loyalty } })
    }
  }

  private async generalDefects(generalId: string) {
    const general: General = await this.prisma?.general?.findUnique?.({
      where: { id: generalId },
      include: { nation: true, units: true },
    })

    if (!general) return

    await this.prisma?.general?.update?.({
      where: { id: generalId },
      data: { isAlive: false },
    })

    this.eventEmitter?.emit('general:defected', {
      generalId,
      nationId: general.nationId,
      generalName: general.name,
      unitsLost: Array.isArray(general.units) ? general.units.length : 0,
      message: `💔 将领${general.name}叛变了！`,
      showDramaticCutscene: true,
      playDramaticMusic: true,
    })
  }

  // Helpers
  private async checkResources(nationId: string, cost: Record<string, number>) {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })
    if (!nation) throw new Error('Nation not found')

    // Simplified: assume resources are fields directly on nation, deduct if sufficient
    const insufficient = Object.entries(cost).filter(([k, v]) => (nation[k] ?? 0) < v)
    if (insufficient.length) throw new Error('Insufficient resources: ' + insufficient.map(([k]) => k).join(', '))

    const newData: Record<string, number> = {}
    for (const [k, v] of Object.entries(cost)) newData[k] = Math.max(0, (nation[k] ?? 0) - v)
    await this.prisma?.nation?.update?.({ where: { id: nationId }, data: newData })
  }

  private generateGeneralName(): string {
    const family = ['李', '王', '张', '刘', '赵', '陈', '杨', '吴']
    const given = ['伟', '强', '军', '磊', '洋', '超', '鹏', '杰']
    return family[Math.floor(Math.random() * family.length)] + given[Math.floor(Math.random() * given.length)]
  }

  private selectRandomPortrait(): string {
    const ids = ['portrait_01', 'portrait_02', 'portrait_03', 'portrait_04']
    return ids[Math.floor(Math.random() * ids.length)]
  }

  private selectRandomTraits(): string[] {
    const keys = Object.keys(this.GENERAL_TRAITS)
    const count = 1 + Math.floor(Math.random() * 2) // 1-2 traits
    const chosen = new Set<string>()
    while (chosen.size < count) chosen.add(keys[Math.floor(Math.random() * keys.length)])
    return Array.from(chosen)
  }

  private async getRecentVictories(_generalId: string): Promise<number> {
    // Placeholder: in real system, query battles in recent timeframe
    return Math.random() < 0.5 ? 1 : 0
  }
}

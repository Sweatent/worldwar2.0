// Core economy simulation - Population Service

function Injectable(): ClassDecorator { return () => {}; }
class BadRequestException extends Error {}

export interface Resources { [key: string]: number }

export interface LaborAllocation {
  agriculture: number
  industry: number
  military: number
  research: number
  services?: number
  [key: string]: number | undefined
}

@Injectable()
export class PopulationService {
  constructor(
    private prisma?: any,
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 计算人口增长（每回合）
  async calculatePopulationGrowth(nationId: string): Promise<bigint> {
    if (!this.prisma?.nation?.findUnique) throw new Error('Prisma client not provided')

    const nation = await this.prisma.nation.findUnique({ where: { id: nationId } })

    const resources = (nation.resources || {}) as Resources
    const currentPop: bigint = nation.population

    // 基础增长率 1%
    let growthRate = 0.01

    // 食物充足度影响
    const foodNeeded = Number(currentPop) / 100
    if ((resources.food || 0) < foodNeeded * 0.5) {
      growthRate = -0.02 // 饥荒，人口减少
    } else if ((resources.food || 0) < foodNeeded) {
      growthRate = 0 // 勉强维持
    } else if ((resources.food || 0) > foodNeeded * 2) {
      growthRate = 0.025 // 食物充足，增长加快
    }

    // 稳定度影响
    if ((nation.stability || 0) < 30) {
      growthRate -= 0.01 // 动荡导致人口流失
    }

    // 科技加成
    const medicalTech = await this.hasCompletedTech(nationId, 'TECH_MODERN_MEDICINE')
    if (medicalTech) {
      growthRate += 0.005
    }

    // 计算增长
    const growth = BigInt(Math.floor(Number(currentPop) * growthRate))
    const newPopulation = BigInt(Number(currentPop) + Number(growth))

    await this.prisma.nation.update({ where: { id: nationId }, data: { population: newPopulation } })

    if (growth < 0n) {
      this.eventEmitter?.emit?.('population:declining', {
        nationId,
        loss: Math.abs(Number(growth)),
        reason: '食物短缺或动荡',
      })
    } else {
      this.eventEmitter?.emit?.('population:growth', {
        nationId,
        growth: Number(growth),
      })
    }

    return growth
  }

  // 劳动力分配
  async allocateLabor(nationId: string, allocation: LaborAllocation) {
    const total = Object.values(allocation).reduce((a, b) => a + (b || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException('劳动力分配必须总和为100%')
    }

    await this.prisma?.nation?.update?.({ where: { id: nationId }, data: { laborAllocation: allocation } })

    await this.applyLaborEffects(nationId, allocation)
  }

  private async hasCompletedTech(nationId: string, techKey: string): Promise<boolean> {
    if (!this.prisma?.nationTechnology?.findFirst) return false
    const tech = await this.prisma.nationTechnology.findFirst({ where: { nationId, techKey, completed: true } })
    return !!tech
  }

  // 影响各项产出：根据分配调整国家的产出系数（存入 nationModifiers）
  private async applyLaborEffects(nationId: string, allocation: LaborAllocation) {
    // 简化：将不同行业配比转换为乘数系数
    const effects = {
      agricultureMultiplier: 0.5 + (allocation.agriculture / 100) * 1.5, // 0.5x ~ 2.0x
      industryMultiplier: 0.5 + (allocation.industry / 100) * 1.5,
      militaryReadiness: Math.round(allocation.military * 1.2), // 数值化的战备度
      researchSpeed: Math.round(allocation.research * 1.5),
      serviceEfficiency: allocation.services ? Math.round(allocation.services * 1.0) : 0,
    }

    await this.prisma?.nationModifier?.upsert?.({
      where: { nationId },
      create: { nationId, effects },
      update: { effects },
    })

    this.eventEmitter?.emit?.('labor:allocationChanged', { nationId, allocation, effects })
  }
}

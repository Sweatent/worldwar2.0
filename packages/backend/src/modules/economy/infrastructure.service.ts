// Core economy simulation - Infrastructure Service

function Injectable(): ClassDecorator { return () => {}; }
class BadRequestException extends Error {}

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

@Injectable()
export class InfrastructureService {
  constructor(
    private prisma?: any,
    private economyService?: { checkResources: (nationId: string, cost: Partial<Resources>) => Promise<void>; deductResources: (nationId: string, cost: Partial<Resources>) => Promise<void> },
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  // 升级基础设施
  async upgradeInfrastructure(territoryId: string) {
    if (!this.prisma?.territory?.findUnique) throw new Error('Prisma client not provided')

    const territory = await this.prisma.territory.findUnique({
      where: { id: territoryId },
      include: { nation: true },
    })

    const currentLevel: number = territory.infrastructureLevel || 0
    if (currentLevel >= 10) {
      throw new BadRequestException('已达到最高等级')
    }

    const cost = this.calculateUpgradeCost(currentLevel)

    if (!this.economyService?.checkResources || !this.economyService?.deductResources) {
      throw new Error('Economy service not provided')
    }

    await this.economyService.checkResources(territory.nationId, cost)
    await this.economyService.deductResources(territory.nationId, cost)

    await this.prisma.territory.update({
      where: { id: territoryId },
      data: { infrastructureLevel: currentLevel + 1 },
    })

    this.eventEmitter?.emit?.('infrastructure:upgraded', {
      territoryId,
      newLevel: currentLevel + 1,
      showCelebration: true,
    })
  }

  // 计算升级成本（越高越贵）
  private calculateUpgradeCost(currentLevel: number): Partial<Resources> {
    const baseCost = 1000
    const multiplier = Math.pow(1.5, currentLevel)

    return {
      money: Math.floor(baseCost * multiplier),
      wood: Math.floor(500 * multiplier),
      ore: Math.floor(300 * multiplier),
      energy: Math.floor(200 * multiplier),
    }
  }
}

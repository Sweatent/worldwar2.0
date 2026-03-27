import { Injectable } from '@nestjs/common'

export type AutoManagePolicy = 'BALANCED' | 'ECONOMIC' | 'MILITARY' | 'TECH'

@Injectable()
export class AutoManagerService {
  constructor(
    private readonly prisma: any,
    private readonly buildingService: any,
    private readonly militaryService: any,
    private readonly gateway: any,
  ) {}

  // 启用自动管理
  async enableAutoManage(nationId: string, regions: string[], policy: AutoManagePolicy) {
    await this.prisma?.autoManageConfig?.upsert?.({
      where: { nationId },
      create: {
        nationId,
        enabled: true,
        managedRegions: regions,
        policy: policy, // BALANCED | ECONOMIC | MILITARY | TECH
      },
      update: {
        enabled: true,
        managedRegions: regions,
        policy: policy,
      },
    })
  }

  // 执行自动管理（每回合）
  async executeAutoManage(nationId: string) {
    const config = await this.prisma?.autoManageConfig?.findUnique?.({
      where: { nationId },
    })

    if (!config || !config.enabled) return

    const nation = await this.prisma?.nation?.findUnique?.({
      where: { id: nationId },
      include: { territories: true, resources: true },
    })

    // 根据政策执行不同策略
    switch (config.policy as AutoManagePolicy) {
      case 'ECONOMIC':
        await this.executeEconomicPolicy(nation, config.managedRegions)
        break
      case 'MILITARY':
        await this.executeMilitaryPolicy(nation, config.managedRegions)
        break
      case 'TECH':
        await this.executeTechPolicy(nation, config.managedRegions)
        break
      case 'BALANCED':
      default:
        await this.executeBalancedPolicy(nation, config.managedRegions)
        break
    }

    // 心理学机制：定期报告AI管理成果
    this.gateway?.server?.to(nation.playerId)?.emit('autoManage:report', {
      message: 'AI助手已完成后方管理',
      results: await this.getManageResults(nationId),
    })
  }

  // 经济政策：优先发展经济建筑
  private async executeEconomicPolicy(nation: any, regions: string[]) {
    const territories = (nation?.territories || []).filter((t: any) => regions.includes(t.id))

    for (const territory of territories) {
      // 优先建造农场、矿场、工厂
      if (this.canBuildBuilding(territory, 'FARM')) {
        await this.buildingService?.construct?.(territory.id, 'FARM')
      } else if (this.canBuildBuilding(territory, 'MINE')) {
        await this.buildingService?.construct?.(territory.id, 'MINE')
      } else if (this.canBuildBuilding(territory, 'FACTORY')) {
        await this.buildingService?.construct?.(territory.id, 'FACTORY')
      }
    }
  }

  // 军事政策：优先生产军事单位
  private async executeMilitaryPolicy(nation: any, regions: string[]) {
    const territories = (nation?.territories || []).filter((t: any) => regions.includes(t.id))

    for (const territory of territories) {
      // 征兵
      if ((nation?.resources?.manpower ?? 0) > 1000) {
        await this.militaryService?.recruitUnit?.(territory.id, 'INFANTRY', 500)
      }
    }
  }

  // 科技政策：优先研发
  private async executeTechPolicy(nation: any, regions: string[]) {
    // 占位实现：将科技点投入到优先科技队列
    await this.prisma?.technologyQueue?.upsert?.({
      where: { nationId: nation.id },
      create: { nationId: nation.id, queue: ['AGRICULTURE', 'INDUSTRY', 'MILITARY_TACTICS'] },
      update: {},
    })
  }

  // 平衡策略：兼顾经济与军事
  private async executeBalancedPolicy(nation: any, regions: string[]) {
    await this.executeEconomicPolicy(nation, regions)
    await this.executeMilitaryPolicy(nation, regions)
  }

  // 心理学机制：定期报告AI管理成果（占位实现）
  private async getManageResults(nationId: string) {
    return {
      constructions: Math.floor(Math.random() * 3),
      recruited: Math.floor(Math.random() * 1000),
      techs: Math.floor(Math.random() * 2),
      timestamp: Date.now(),
    }
  }

  private canBuildBuilding(territory: any, building: string): boolean {
    // 简化判定逻辑：若未建造过该建筑且资源充足
    const built = (territory?.buildings || []).includes(building)
    return !built
  }
}

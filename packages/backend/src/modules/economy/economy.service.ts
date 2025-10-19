// Core economy simulation - Economy Utility Service

function Injectable(): ClassDecorator { return () => {}; }
class BadRequestException extends Error {}

export interface Resources { [key: string]: number }

@Injectable()
export class EconomyService {
  constructor(
    private prisma?: any,
    private eventEmitter?: { emit: (event: string, payload: any) => void },
  ) {}

  async checkResources(nationId: string, cost: Partial<Resources>) {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })
    if (!nation) throw new Error('Nation not found')
    const resources = (nation.resources || {}) as Resources

    for (const [k, v] of Object.entries(cost || {})) {
      if ((resources[k] || 0) < (v as number)) {
        throw new BadRequestException(`资源不足：${k}`)
      }
    }
  }

  async deductResources(nationId: string, cost: Partial<Resources>) {
    const nation = await this.prisma?.nation?.findUnique?.({ where: { id: nationId } })
    if (!nation) throw new Error('Nation not found')
    const resources = { ...(nation.resources || {}) } as Resources

    for (const [k, v] of Object.entries(cost || {})) {
      resources[k] = Math.max(0, (resources[k] || 0) - (v as number))
    }

    await this.prisma?.nation?.update?.({ where: { id: nationId }, data: { resources } })

    this.eventEmitter?.emit?.('economy:resourcesChanged', { nationId, resources })
  }
}

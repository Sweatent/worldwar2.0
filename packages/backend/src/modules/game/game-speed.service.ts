import { Injectable, BadRequestException } from '@nestjs/common'

@Injectable()
export class GameSpeedService {
  private speedMultipliers: Map<string, number> = new Map()
  private timeScaleMultipliers: Map<string, number> = new Map()

  constructor(
    private readonly gateway: any,
    private readonly prisma: any,
    private readonly battleService: any,
  ) {}

  // 设置游戏速度（1x/2x/4x/8x）
  async setSpeed(roomId: string, speed: number) {
    const validSpeeds = [1, 2, 4, 8]
    if (!validSpeeds.includes(speed)) {
      throw new BadRequestException('Invalid speed')
    }

    this.speedMultipliers.set(roomId, speed)

    // 通知所有玩家
    this.gateway?.server?.to(roomId)?.emit('game:speedChanged', { speed })

    // 心理学机制：和平期自动建议快进
    if (speed === 1) {
      const isInPeace = await this.checkIfPeaceful(roomId)
      if (isInPeace) {
        this.gateway?.server?.to(roomId)?.emit('game:suggestSpeedUp', {
          message: '当前处于和平建设期，建议加速游戏节奏',
        })
      }
    }
  }

  // 获取当前速度
  getSpeed(roomId: string): number {
    return this.speedMultipliers.get(roomId) ?? 1
  }

  // 设置时间缩放（0.5x~2.0x）用于战斗阶段时间压缩
  async setTimeScale(roomId: string, timeScale: number) {
    if (timeScale <= 0) {
      throw new BadRequestException('Invalid timeScale')
    }

    this.timeScaleMultipliers.set(roomId, timeScale)
    this.gateway?.server?.to(roomId)?.emit('game:timeScaleChanged', { timeScale })
  }

  getTimeScale(roomId: string): number {
    return this.timeScaleMultipliers.get(roomId) ?? 1.0
  }

  // 检查是否处于和平期
  private async checkIfPeaceful(roomId: string): Promise<boolean> {
    // 获取相关国家与部队信息（如果需要）
    await this.prisma?.nation?.findMany?.({
      where: { gameRoomId: roomId },
      include: { units: true },
    })

    // 检查是否有战争
    const hasActiveBattles = await this.battleService?.hasActiveBattles?.(roomId)
    return !hasActiveBattles
  }
}

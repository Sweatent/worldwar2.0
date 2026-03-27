import { Injectable } from '@nestjs/common'

@Injectable()
export class BattleCompressionService {
  constructor(
    private readonly prisma: any,
    private readonly gameSpeedService: any,
  ) {}

  // 检测战争强度
  async getBattleIntensity(roomId: string): Promise<'PEACE' | 'SKIRMISH' | 'WAR' | 'WORLD_WAR'> {
    const battles = await this.prisma?.battle?.findMany?.({
      where: {
        gameRoomId: roomId,
        status: 'ACTIVE',
      },
    })

    const totalUnitsInvolved = (battles || []).reduce((sum: number, b: any) => {
      return sum + (b.attackerUnits || 0) + (b.defenderUnits || 0)
    }, 0)

    if (!battles || battles.length === 0) return 'PEACE'
    if (battles.length < 3 && totalUnitsInvolved < 10000) return 'SKIRMISH'
    if (battles.length < 6 || totalUnitsInvolved < 50000) return 'WAR'
    return 'WORLD_WAR'
  }

  // 根据强度调整时间流速（心理学机制：关键时刻慢放）
  async adjustTimeScale(roomId: string) {
    const intensity = await this.getBattleIntensity(roomId)

    let timeScale = 1.0
    switch (intensity) {
      case 'PEACE':
        timeScale = 2.0 // 和平期可2倍速
        break
      case 'SKIRMISH':
        timeScale = 1.0
        break
      case 'WAR':
        timeScale = 0.75 // 战争时稍微慢一点
        break
      case 'WORLD_WAR':
        timeScale = 0.5 // 世界大战进入"战术时间"
        break
    }

    await this.gameSpeedService?.setTimeScale?.(roomId, timeScale)
  }
}

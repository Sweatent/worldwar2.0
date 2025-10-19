import { Injectable, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

@Injectable()
export class SaveSystemService {
  constructor(
    private readonly prisma: any,
    private readonly gameStateService: any,
    private readonly gateway: any,
  ) {}

  // 自动保存（每5分钟或关键节点）
  @Cron('*/5 * * * *')
  async autoSave() {
    const activeRooms = await this.prisma?.gameRoom?.findMany?.({
      where: { status: 'IN_PROGRESS' },
    })

    for (const room of activeRooms || []) {
      await this.saveGame(room.id, 'AUTO')
    }
  }

  // 保存游戏
  async saveGame(roomId: string, type: 'AUTO' | 'MANUAL') {
    const gameState = await this.gameStateService?.createSnapshot?.(roomId)

    // 保存到数据库
    await this.prisma?.gameSave?.create?.({
      data: {
        gameRoomId: roomId,
        saveType: type,
        stateData: gameState,
        createdAt: new Date(),
      },
    })

    // 心理学机制：显示保存成功提示（降低玩家焦虑）
    if (type === 'MANUAL') {
      this.gateway?.server?.to(roomId)?.emit('game:saved', {
        message: '游戏已保存',
        timestamp: Date.now(),
      })
    }
  }

  // 加载游戏
  async loadGame(roomId: string, saveId: string) {
    const save = await this.prisma?.gameSave?.findUnique?.({
      where: { id: saveId },
    })

    if (!save) throw new NotFoundException('Save not found')

    // 恢复游戏状态
    await this.gameStateService?.restoreSnapshot?.(roomId, save.stateData)

    return { success: true, loadedAt: Date.now() }
  }

  // 断线重连恢复
  async reconnectPlayer(roomId: string, playerId: string) {
    // 获取最新游戏状态
    const gameState = await this.gameStateService?.getLatestState?.(roomId)

    // 获取玩家的国家状态
    const nation = await this.prisma?.nation?.findFirst?.({
      where: { gameRoomId: roomId, playerId },
      include: {
        territories: true,
        units: true,
        technologies: true,
      },
    })

    // 发送完整状态给重连玩家
    this.gateway?.server?.to(playerId)?.emit('game:reconnected', {
      gameState,
      nation,
      message: '重新连接成功，游戏状态已恢复',
    })
  }
}

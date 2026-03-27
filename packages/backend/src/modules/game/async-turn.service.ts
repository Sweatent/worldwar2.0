import { Injectable } from '@nestjs/common'

@Injectable()
export class AsyncTurnService {
  private playerSubmissions: Map<string, Map<string, boolean>> = new Map()

  constructor(
    private readonly prisma: any,
    private readonly gateway: any,
    private readonly redis: any,
  ) {}

  // 玩家提交操作
  async submitTurn(roomId: string, playerId: string, actions: any[]) {
    // 记录玩家已提交
    if (!this.playerSubmissions.has(roomId)) {
      this.playerSubmissions.set(roomId, new Map())
    }
    this.playerSubmissions.get(roomId)!.set(playerId, true)

    // 保存玩家操作到队列
    await this.redis?.rpush?.(
      `game:room:${roomId}:player:${playerId}:actions`,
      JSON.stringify(actions),
    )

    // 检查是否所有玩家都提交了
    const allSubmitted = await this.checkAllSubmitted(roomId)

    if (allSubmitted) {
      // 提前进入下一阶段（心理学机制：不让玩家等待）
      await this.advancePhase(roomId)

      // 通知所有玩家
      this.gateway?.server?.to(roomId)?.emit('phase:advanced', {
        message: '所有玩家已准备就绪，提前进入下一阶段',
      })
    } else {
      // 显示等待其他玩家
      const waitingFor = await this.getWaitingPlayers(roomId)
      this.gateway?.server?.to(roomId)?.emit('turn:waiting', {
        waitingFor,
        submitted: this.playerSubmissions.get(roomId)!.size,
        total: await this.getTotalPlayers(roomId),
      })
    }
  }

  // 检查所有玩家是否已提交
  private async checkAllSubmitted(roomId: string): Promise<boolean> {
    const room = await this.prisma?.gameRoom?.findUnique?.({
      where: { id: roomId },
      include: { players: true },
    })

    const submissions = this.playerSubmissions.get(roomId)
    if (!submissions || !room?.players) return false

    return room.players.every((p: any) => submissions.get(p.playerId))
  }

  private async getWaitingPlayers(roomId: string): Promise<string[]> {
    const room = await this.prisma?.gameRoom?.findUnique?.({
      where: { id: roomId },
      include: { players: true },
    })
    const submissions = this.playerSubmissions.get(roomId) || new Map<string, boolean>()
    const players = room?.players || []
    return players
      .filter((p: any) => !submissions.get(p.playerId))
      .map((p: any) => p.playerId)
  }

  private async getTotalPlayers(roomId: string): Promise<number> {
    const room = await this.prisma?.gameRoom?.findUnique?.({
      where: { id: roomId },
      include: { players: true },
    })
    return room?.players?.length ?? 0
  }

  private async advancePhase(roomId: string): Promise<void> {
    // 将房间阶段推进一个步骤，并清理本回合提交标记
    const current = this.playerSubmissions.get(roomId)
    if (current) current.clear()

    // 假设存在阶段推进逻辑
    await this.prisma?.gameRoom?.update?.({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    })
  }
}

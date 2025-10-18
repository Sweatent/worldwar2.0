import { Body, Controller, Param, Post, UseGuards, BadRequestException } from '@nestjs/common'

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard'
import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { TurnSchedulerService } from '@/modules/game/turn-scheduler.service'

@Controller('game/speed')
@UseGuards(JwtAuthGuard)
export class GameSpeedController {
  constructor(
    private readonly turnScheduler: TurnSchedulerService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':roomId/speed')
  async setGameSpeed(@Param('roomId') roomId: string, @Body('speed') speed: number) {
    const validSpeeds = [1, 2, 4, 8]
    if (!validSpeeds.includes(speed)) {
      throw new BadRequestException('Invalid speed value')
    }

    await this.redis.hset(`game:room:${roomId}:config`, 'gameSpeed', speed)
    await this.turnScheduler.updateGameSpeed(roomId, speed)

    return { success: true, speed }
  }

  @Post(':roomId/pause')
  async pauseGame(@Param('roomId') roomId: string) {
    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: 'PAUSED' },
    })
    await this.turnScheduler.pauseGame(roomId)
    return { success: true, status: 'PAUSED' }
  }

  @Post(':roomId/resume')
  async resumeGame(@Param('roomId') roomId: string) {
    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: 'IN_PROGRESS' },
    })
    await this.turnScheduler.resumeGame(roomId)
    return { success: true, status: 'IN_PROGRESS' }
  }
}

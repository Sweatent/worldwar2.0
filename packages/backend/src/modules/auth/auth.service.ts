import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { Player } from '@/common/types/game.types'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async register(username: string, email: string, password: string) {
    const existing = await this.prisma.player.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException('Email already registered')
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const player = await this.prisma.player.create({
      data: {
        username,
        email,
        passwordHash,
        lastPlayedAt: null,
      },
    })
    return this.generateTokens(player)
  }

  async login(email: string, password: string) {
    const player = await this.prisma.player.findUnique({ where: { email } })
    if (!player) throw new UnauthorizedException('Invalid credentials')

    const isValid = await bcrypt.compare(password, player.passwordHash)
    if (!isValid) throw new UnauthorizedException('Invalid credentials')

    const updatedPlayer = await this.prisma.player.update({
      where: { id: player.id },
      data: { lastPlayedAt: new Date() },
    })

    return this.generateTokens(updatedPlayer)
  }

  private async generateTokens(player: Player) {
    const payload = { sub: player.id, username: player.username }
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' })
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' })

    await this.redis.hset(`player:session:${player.id}`, 'accessToken', accessToken)
    await this.redis.hset(
      `player:session:${player.id}`,
      'lastActiveAt',
      new Date().toISOString(),
    )

    return { accessToken, refreshToken, player }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token)
      const player = await this.prisma.player.findUnique({ where: { id: payload.sub } })
      if (!player) {
        throw new UnauthorizedException('Invalid token')
      }
      return player
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Invalid token')
    }
  }
}

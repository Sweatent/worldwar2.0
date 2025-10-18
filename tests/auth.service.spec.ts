import { describe, expect, it, beforeEach } from 'vitest'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import { AuthService } from '@/modules/auth/auth.service'
import { JwtService } from '@nestjs/jwt'

describe('AuthService', () => {
  let prisma: PrismaService
  let redis: RedisService
  let authService: AuthService

  beforeEach(() => {
    prisma = new PrismaService()
    redis = new RedisService()
    const jwtService = new JwtService('test-secret')
    authService = new AuthService(jwtService, prisma, redis)
  })

  it('registers a new player with hashed password', async () => {
    const result = await authService.register('alice', 'alice@example.com', 'Password123!')
    const stored = await prisma.player.findUnique({ where: { email: 'alice@example.com' } })
    expect(stored?.passwordHash).toBeDefined()
    expect(stored?.passwordHash).not.toBe('Password123!')
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
  })

  it('allows login and updates last played time', async () => {
    await authService.register('bob', 'bob@example.com', 'Secr3t!')
    const before = await prisma.player.findUnique({ where: { email: 'bob@example.com' } })
    expect(before?.lastPlayedAt).toBeNull()

    const result = await authService.login('bob@example.com', 'Secr3t!')
    expect(result.accessToken).toBeTruthy()

    const after = await prisma.player.findUnique({ where: { email: 'bob@example.com' } })
    expect(after?.lastPlayedAt).toBeInstanceOf(Date)
  })

  it('validates JWT tokens', async () => {
    const { accessToken, player } = await authService.register('carol', 'carol@example.com', 'safePass1!')
    const validated = await authService.validateToken(accessToken)
    expect(validated?.id).toBe(player.id)
    expect(validated?.email).toBe('carol@example.com')
  })
})

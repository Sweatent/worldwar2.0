import { UnauthorizedException } from './nest-common'

type ExpiresIn = number | string | undefined

function parseExpiresIn(expiresIn: ExpiresIn): number | null {
  if (!expiresIn && expiresIn !== 0) return null
  if (typeof expiresIn === 'number') return expiresIn * 1000
  const match = /^([0-9]+)\s*(ms|s|m|h|d)?$/i.exec(expiresIn.trim())
  if (!match) return null
  const value = Number(match[1])
  const unit = (match[2] || 's').toLowerCase()
  switch (unit) {
    case 'ms':
      return value
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return null
  }
}

interface SignOptions {
  expiresIn?: ExpiresIn
}

export class JwtService {
  constructor(private readonly secret = 'default-secret') {}

  sign(payload: any, options?: SignOptions): string {
    const expiresInMs = parseExpiresIn(options?.expiresIn)
    const envelope = {
      payload,
      exp: expiresInMs ? Date.now() + expiresInMs : null,
      secret: this.secret,
    }
    const json = JSON.stringify(envelope)
    return Buffer.from(json).toString('base64url')
  }

  verify(token: string): any {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8')
      const envelope = JSON.parse(decoded)
      if (envelope.secret !== this.secret) {
        throw new UnauthorizedException('Invalid token secret')
      }
      if (envelope.exp && envelope.exp < Date.now()) {
        throw new UnauthorizedException('Token expired')
      }
      return envelope.payload
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new UnauthorizedException('Invalid token')
    }
  }
}

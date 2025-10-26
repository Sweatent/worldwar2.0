import type { RectangleLike } from './types'

export function boundsIntersect(a: RectangleLike, b: RectangleLike): boolean {
  return (
    a.x + a.width >= b.x &&
    a.x <= b.x + b.width &&
    a.y + a.height >= b.y &&
    a.y <= b.y + b.height
  )
}

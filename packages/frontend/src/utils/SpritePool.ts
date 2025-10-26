import * as PIXI from 'pixi.js'

export class SpritePool {
  private pool: PIXI.Sprite[] = []
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  getSprite(texture?: PIXI.Texture): PIXI.Sprite {
    let sprite = this.pool.pop()
    
    if (!sprite) {
      sprite = new PIXI.Sprite()
    }

    if (texture) {
      sprite.texture = texture
    }
    
    sprite.visible = true
    sprite.alpha = 1
    sprite.tint = 0xffffff
    sprite.scale.set(1, 1)
    sprite.rotation = 0
    sprite.anchor.set(0, 0)

    return sprite
  }

  returnSprite(sprite: PIXI.Sprite) {
    if (this.pool.length >= this.maxSize) {
      sprite.destroy()
      return
    }

    sprite.visible = false
    sprite.texture = PIXI.Texture.EMPTY
    this.pool.push(sprite)
  }

  clear() {
    for (const sprite of this.pool) {
      sprite.destroy()
    }
    this.pool = []
  }

  get size(): number {
    return this.pool.length
  }
}

import * as PIXI from 'pixi.js'
import type { Battle, BattleRound, MilitaryUnit, Point } from '../../types/game'

export class BattleVisualization {
  private unitSprites: Map<string, PIXI.Sprite> = new Map()
  private soundEnabled: boolean = true
  private onZoomToBattle?: (territoryId: string) => void

  constructor(onZoomToBattle?: (territoryId: string) => void) {
    this.onZoomToBattle = onZoomToBattle
  }

  async visualizeBattle(battle: Battle, layer: PIXI.Container): Promise<void> {
    await this.zoomToBattle(battle.territoryId)

    for (const round of battle.battleLog) {
      await this.playBattleRound(round, layer)
    }

    if (battle.result) {
      await this.showBattleResult(battle.result, layer)
    }
  }

  private async zoomToBattle(territoryId: string): Promise<void> {
    if (this.onZoomToBattle) {
      this.onZoomToBattle(territoryId)
    }
    await this.delay(1000)
  }

  private async playBattleRound(round: BattleRound, layer: PIXI.Container): Promise<void> {
    await this.playAttackAnimation(
      round.attackerUnits,
      round.defenderUnits,
      round.attackerDamage,
      layer
    )

    await this.playAttackAnimation(
      round.defenderUnits,
      round.attackerUnits,
      round.defenderDamage,
      layer
    )

    this.showCasualtyNumbers(round, layer)
    await this.delay(500)
  }

  private async playAttackAnimation(
    attackers: MilitaryUnit[],
    defenders: MilitaryUnit[],
    damage: number,
    layer: PIXI.Container
  ): Promise<void> {
    const attackerFlashes: Promise<void>[] = []
    for (const unit of attackers) {
      const sprite = this.getUnitSprite(unit.id)
      if (sprite) {
        attackerFlashes.push(this.flashSprite(sprite, 0xff0000, 300))
      }
    }
    await Promise.all(attackerFlashes)

    if (attackers.length > 0 && defenders.length > 0) {
      await this.drawProjectiles(attackers, defenders, layer)
    }

    const defenderShakes: Promise<void>[] = []
    for (const unit of defenders) {
      const sprite = this.getUnitSprite(unit.id)
      if (sprite) {
        defenderShakes.push(this.shakeSprite(sprite, 5, 200))
      }
    }
    await Promise.all(defenderShakes)

    if (defenders.length > 0) {
      this.showDamageNumbers(defenders[0].position, damage, layer)
    }

    this.playSound('battle_hit')
  }

  private getUnitSprite(unitId: string): PIXI.Sprite | undefined {
    return this.unitSprites.get(unitId)
  }

  private async flashSprite(
    sprite: PIXI.Sprite,
    color: number,
    duration: number
  ): Promise<void> {
    const originalTint = sprite.tint
    sprite.tint = color

    await this.delay(duration)
    sprite.tint = originalTint
  }

  private async shakeSprite(
    sprite: PIXI.Sprite,
    intensity: number,
    duration: number
  ): Promise<void> {
    const originalX = sprite.x
    const originalY = sprite.y
    const startTime = Date.now()

    return new Promise((resolve) => {
      const ticker = new PIXI.Ticker()
      ticker.add(() => {
        const elapsed = Date.now() - startTime
        if (elapsed >= duration) {
          sprite.x = originalX
          sprite.y = originalY
          ticker.stop()
          ticker.destroy()
          resolve()
        } else {
          sprite.x = originalX + (Math.random() - 0.5) * intensity * 2
          sprite.y = originalY + (Math.random() - 0.5) * intensity * 2
        }
      })
      ticker.start()
    })
  }

  private async drawProjectiles(
    attackers: MilitaryUnit[],
    defenders: MilitaryUnit[],
    layer: PIXI.Container
  ): Promise<void> {
    const projectiles: PIXI.Graphics[] = []

    for (let i = 0; i < Math.min(attackers.length, 3); i++) {
      const attacker = attackers[i]
      const defender = defenders[i % defenders.length]

      const projectile = new PIXI.Graphics()
      projectile.beginFill(0xffff00, 0.8)
      projectile.drawCircle(0, 0, 4)
      projectile.endFill()
      projectile.x = attacker.position.x
      projectile.y = attacker.position.y

      layer.addChild(projectile)
      projectiles.push(projectile)

      this.animateProjectile(projectile, attacker.position, defender.position, 300)
    }

    await this.delay(300)

    for (const projectile of projectiles) {
      layer.removeChild(projectile)
      projectile.destroy()
    }
  }

  private animateProjectile(
    projectile: PIXI.Graphics,
    from: Point,
    to: Point,
    duration: number
  ) {
    const startTime = Date.now()
    const deltaX = to.x - from.x
    const deltaY = to.y - from.y

    const ticker = new PIXI.Ticker()
    ticker.add(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      projectile.x = from.x + deltaX * progress
      projectile.y = from.y + deltaY * progress

      if (progress >= 1) {
        ticker.stop()
        ticker.destroy()
      }
    })
    ticker.start()
  }

  private showDamageNumbers(position: Point, damage: number, layer: PIXI.Container) {
    const text = new PIXI.Text(`-${damage}`, {
      fontSize: 24,
      fill: 0xff0000,
      fontWeight: 'bold',
      stroke: 0xffffff,
      strokeThickness: 2,
    })
    text.x = position.x
    text.y = position.y

    layer.addChild(text)

    const ticker = new PIXI.Ticker()
    ticker.add(() => {
      text.y -= 2
      text.alpha -= 0.02

      if (text.alpha <= 0) {
        layer.removeChild(text)
        text.destroy()
        ticker.stop()
        ticker.destroy()
      }
    })
    ticker.start()
  }

  private showCasualtyNumbers(round: BattleRound, layer: PIXI.Container) {
    if (round.attackerUnits.length > 0) {
      const avgPosition = this.getAveragePosition(round.attackerUnits)
      this.showCasualtyText(
        avgPosition,
        `攻方伤亡: ${round.casualties.attacker}`,
        0xff6666,
        layer
      )
    }

    if (round.defenderUnits.length > 0) {
      const avgPosition = this.getAveragePosition(round.defenderUnits)
      this.showCasualtyText(
        avgPosition,
        `守方伤亡: ${round.casualties.defender}`,
        0x6666ff,
        layer
      )
    }
  }

  private showCasualtyText(
    position: Point,
    text: string,
    color: number,
    layer: PIXI.Container
  ) {
    const casualtyText = new PIXI.Text(text, {
      fontSize: 16,
      fill: color,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 2,
    })
    casualtyText.x = position.x - casualtyText.width / 2
    casualtyText.y = position.y + 40

    layer.addChild(casualtyText)

    setTimeout(() => {
      layer.removeChild(casualtyText)
      casualtyText.destroy()
    }, 2000)
  }

  private getAveragePosition(units: MilitaryUnit[]): Point {
    if (units.length === 0) return { x: 0, y: 0 }

    const sum = units.reduce(
      (acc, unit) => ({
        x: acc.x + unit.position.x,
        y: acc.y + unit.position.y,
      }),
      { x: 0, y: 0 }
    )

    return {
      x: sum.x / units.length,
      y: sum.y / units.length,
    }
  }

  private async showBattleResult(
    result: { winner: string; attackerCasualties: number; defenderCasualties: number },
    layer: PIXI.Container
  ): Promise<void> {
    const resultText = new PIXI.Text(`战斗结束！胜者: ${result.winner}`, {
      fontSize: 32,
      fill: 0xffd700,
      fontWeight: 'bold',
      stroke: 0x000000,
      strokeThickness: 4,
    })
    resultText.x = 200
    resultText.y = 100

    layer.addChild(resultText)

    await this.delay(3000)

    layer.removeChild(resultText)
    resultText.destroy()
  }

  private playSound(soundId: string) {
    if (!this.soundEnabled) return
    console.log(`Playing sound: ${soundId}`)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  registerUnitSprite(unitId: string, sprite: PIXI.Sprite) {
    this.unitSprites.set(unitId, sprite)
  }

  unregisterUnitSprite(unitId: string) {
    this.unitSprites.delete(unitId)
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled
  }

  destroy() {
    this.unitSprites.clear()
  }
}

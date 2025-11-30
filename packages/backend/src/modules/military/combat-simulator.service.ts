// Combat Simulator Service
// Self-contained implementation with lightweight stubs for external dependencies

import { COMBAT_MODIFIERS, UNIT_DEFINITIONS, TerrainType } from '../../../../shared/src/constants/unit-definitions'

// Lightweight decorator stubs to avoid framework coupling
function Injectable(): ClassDecorator {
  return () => {}
}

// Minimal supporting types
export interface MilitaryUnit {
  id: string
  type: keyof typeof UNIT_DEFINITIONS | string
  quantity: number
  supply: number // 0-100
  morale: number // 0-100
  experience: number // 0+
  generalId?: string | null
  nationId?: string
  territoryId?: string
}

export interface TerritoryBuilding { type: string }
export interface Territory {
  id: string
  type: TerrainType
  isCapital?: boolean
  hasPort?: boolean
  buildings?: TerritoryBuilding[]
  adjacentTerritoryIds?: string[]
  neighbors?: string[]
  connections?: string[]
}

export type BattleSide = 'ATTACK' | 'DEFENSE'

export interface CombatPowerUnitDetail {
  unitId: string
  power: number
  type: string
  category: string
  quantity: number
}

export interface CombatPower {
  totalPower: number
  unitDetails: CombatPowerUnitDetail[]
  attackerTags?: Set<string>
}

export interface BattleLogEntry {
  round: number
  attackerDamage: number
  defenderDamage: number
  attackerRemaining: number
  defenderRemaining: number
}

export interface BattleResult {
  winner: 'ATTACKER' | 'DEFENDER'
  attackerLosses: number
  defenderLosses: number
  battleLog: BattleLogEntry[]
  territoryStatus: 'CAPTURED' | 'HELD'
}

@Injectable()
export class CombatSimulatorService {
  // Lightweight stubs for platform services
  private prisma: any
  private gateway: any = {
    server: {
      to: (_id: string) => ({ emit: (_evt: string, _payload: any) => {} }),
      emit: (_evt: string, _payload: any) => {},
    },
  }

  constructor(prisma?: any, gateway?: any) {
    this.prisma = prisma
    if (gateway) this.gateway = gateway
  }

  // 模拟战斗
  async simulateBattle(
    attackerId: string,
    defenderId: string,
    territoryId: string,
  ): Promise<BattleResult> {
    const attackerUnits = await this.getUnitsInTerritory(attackerId, territoryId)
    const defenderUnits = await this.getUnitsInTerritory(defenderId, territoryId)

    const territory: Territory = (await this.prisma?.territory?.findUnique?.({
      where: { id: territoryId },
    })) ?? { id: territoryId, type: 'PLAINS' }

    const attackerPower = await this.calculateCombatPower(
      attackerUnits,
      territory,
      'ATTACK'
    )
    const defenderPower = await this.calculateCombatPower(
      defenderUnits,
      territory,
      'DEFENSE'
    )

    const battleLog: BattleLogEntry[] = []
    let attackerLosses = 0
    let defenderLosses = 0
    let round = 1

    while (attackerPower.totalPower > 0 && defenderPower.totalPower > 0 && round <= 10) {
      const attackerDamage = this.calculateDamage(
        attackerPower,
        defenderPower,
        territory.type
      )
      const defenderDamage = this.calculateDamage(
        defenderPower,
        attackerPower,
        territory.type
      )

      defenderPower.totalPower = Math.max(0, defenderPower.totalPower - attackerDamage)
      attackerPower.totalPower = Math.max(0, attackerPower.totalPower - defenderDamage)

      attackerLosses += defenderDamage
      defenderLosses += attackerDamage

      battleLog.push({
        round,
        attackerDamage,
        defenderDamage,
        attackerRemaining: attackerPower.totalPower,
        defenderRemaining: defenderPower.totalPower,
      })

      round++
    }

    const winner: 'ATTACKER' | 'DEFENDER' = defenderPower.totalPower <= 0 ? 'ATTACKER' : 'DEFENDER'

    await this.applyCasualties(attackerUnits, attackerLosses)
    await this.applyCasualties(defenderUnits, defenderLosses)

    if (winner === 'ATTACKER') {
      await this.captureTerritory(territoryId, attackerId)
    }

    const result: BattleResult = {
      winner,
      attackerLosses,
      defenderLosses,
      battleLog,
      territoryStatus: winner === 'ATTACKER' ? 'CAPTURED' : 'HELD',
    }

    await this.sendBattleReport(result, attackerId, defenderId)

    return result
  }

  // 计算战斗力（考虑地形、补给、士气、经验、将领）
  private async calculateCombatPower(
    units: MilitaryUnit[],
    territory: Territory,
    mode: BattleSide
  ): Promise<CombatPower> {
    let totalPower = 0
    const unitDetails: CombatPowerUnitDetail[] = []

    for (const unit of units) {
      const def = UNIT_DEFINITIONS[unit.type] ?? UNIT_DEFINITIONS[unit.type as keyof typeof UNIT_DEFINITIONS]
      if (!def) continue
      const baseStat = mode === 'ATTACK' ? def.stats.attack : def.stats.defense
      const terrainModifier = (def.terrain?.[territory.type] ?? 1.0)
      const supplyModifier = Math.max(0, Math.min(1, (unit.supply ?? 100) / 100))
      const moraleModifier = Math.max(0.5, Math.min(1.5, (unit.morale ?? 100) / 100))
      const experienceBonus = 1 + ((unit.experience ?? 0) / 100) * 0.5
      const generalBonus = await this.getGeneralBonus(unit.generalId ?? undefined, mode)

      const unitPower =
        baseStat *
        (unit.quantity ?? 0) *
        terrainModifier *
        supplyModifier *
        moraleModifier *
        experienceBonus *
        generalBonus

      totalPower += unitPower
      unitDetails.push({
        unitId: unit.id,
        power: unitPower,
        type: String(unit.type),
        category: String(def.category),
        quantity: unit.quantity,
      })
    }

    return { totalPower, unitDetails }
  }

  // 计算伤害（考虑克制关系）
  private calculateDamage(
    attacker: CombatPower,
    defender: CombatPower,
    _terrain: TerrainType
  ): number {
    const baseDamage = attacker.totalPower * 0.1
    const randomFactor = 0.8 + Math.random() * 0.4 // 80%-120%
    const counterModifier = this.getCounterModifier(attacker, defender)
    const finalDamage = baseDamage * randomFactor * counterModifier
    return Math.floor(finalDamage)
  }

  // 根据双方编成估算克制修正
  private getCounterModifier(attacker: CombatPower, defender: CombatPower): number {
    if (!attacker.unitDetails.length || !defender.unitDetails.length) return 1

    // Collect tags for both sides
    const aTags = new Set<string>()
    const dTags = new Set<string>()

    const inferTags = (detail: CombatPowerUnitDetail, set: Set<string>) => {
      set.add(detail.type)
      set.add(detail.category)
      if (detail.type.includes('TANK') || detail.category === 'ARMOR') set.add('TANK')
      if (detail.type.includes('INFANTRY') || detail.category === 'INFANTRY') set.add('INFANTRY')
      if (detail.category === 'AIR') set.add('AIR')
      if (detail.category === 'NAVAL') set.add('NAVAL')
      if (detail.type.includes('BOMBER')) set.add('BOMBER')
      if (detail.type.includes('FIGHTER')) set.add('FIGHTER')
      if (detail.type === 'GUERRILLA' || detail.category === 'SPECIAL') set.add('SPECIAL')
    }

    attacker.unitDetails.forEach(d => inferTags(d, aTags))
    defender.unitDetails.forEach(d => inferTags(d, dTags))

    let modifier = 1

    // Specific matrix rules
    if (aTags.has('INFANTRY') && dTags.has('TANK')) modifier *= COMBAT_MODIFIERS.INFANTRY_VS_TANK
    if (aTags.has('TANK') && dTags.has('INFANTRY')) modifier *= COMBAT_MODIFIERS.TANK_VS_INFANTRY
    if (aTags.has('FIGHTER') && dTags.has('BOMBER')) modifier *= COMBAT_MODIFIERS.FIGHTER_VS_BOMBER
    const defenderIsGround = dTags.has('INFANTRY') || dTags.has('TANK') || dTags.has('SPECIAL')
    if (aTags.has('BOMBER') && defenderIsGround) modifier *= COMBAT_MODIFIERS.BOMBER_VS_GROUND
    if (aTags.has('ARTILLERY') && dTags.has('INFANTRY')) modifier *= COMBAT_MODIFIERS.ARTILLERY_VS_INFANTRY

    // Average effect of counters based on unit definitions
    // If attacker counters defender, boost; if counteredBy, reduce.
    const weightedCounterEffect = (source: CombatPower, target: CombatPower) => {
      let weightSum = 0
      let effect = 0
      for (const s of source.unitDetails) {
        const def = UNIT_DEFINITIONS[s.type]
        if (!def) continue
        const sWeight = Math.max(0, s.power)
        weightSum += sWeight
        const sCounters = new Set(def.counters ?? [])
        const sCounteredBy = new Set(def.counteredBy ?? [])
        // Build target tag set per earlier
        const tTags = new Set<string>()
        for (const t of target.unitDetails) {
          tTags.add(t.type)
          tTags.add(t.category)
          if (t.type.includes('TANK') || t.category === 'ARMOR') tTags.add('TANK')
          if (t.type.includes('INFANTRY') || t.category === 'INFANTRY') tTags.add('INFANTRY')
          if (t.type.includes('BOMBER')) tTags.add('BOMBER')
          if (t.type.includes('FIGHTER')) tTags.add('FIGHTER')
        }
        let local = 1
        for (const tag of tTags) {
          if (sCounters.has(tag)) local *= 1.2
          if (sCounteredBy.has(tag)) local *= 0.8
        }
        effect += sWeight * local
      }
      if (!weightSum) return 1
      return effect / weightSum
    }

    modifier *= weightedCounterEffect(attacker, defender)

    // Clamp to reasonable range to avoid extremes
    modifier = Math.max(0.25, Math.min(3.0, modifier))
    return modifier
  }

  // 应用伤亡（按HP权重分配）
  private async applyCasualties(units: MilitaryUnit[], totalLosses: number) {
    const totalHp = units.reduce((sum, u) => {
      const def = UNIT_DEFINITIONS[u.type]
      return def ? sum + def.stats.hp * (u.quantity ?? 0) : sum
    }, 0)
    if (totalHp <= 0) return

    for (const unit of units) {
      const def = UNIT_DEFINITIONS[unit.type]
      if (!def) continue
      const unitTotalHp = def.stats.hp * (unit.quantity ?? 0)
      const lossRatio = unitTotalHp / totalHp
      const unitLosses = Math.floor((totalLosses * lossRatio) / def.stats.hp)
      const newQuantity = Math.max(0, (unit.quantity ?? 0) - unitLosses)

      try {
        await this.prisma?.militaryUnit?.update?.({
          where: { id: unit.id },
          data: {
            quantity: newQuantity,
            experience: (unit.experience ?? 0) + 10,
          },
        })
        if (newQuantity === 0) {
          await this.prisma?.militaryUnit?.delete?.({ where: { id: unit.id } })
        }
      } catch {
        // ignore in stub
      }
    }
  }

  private async captureTerritory(territoryId: string, attackerId: string) {
    try {
      await this.prisma?.territory?.update?.({
        where: { id: territoryId },
        data: { ownerId: attackerId },
      })
    } catch {
      // ignore in stub
    }
  }

  private async sendBattleReport(
    result: BattleResult,
    attackerId: string,
    defenderId: string,
  ) {
    try {
      const attacker = (await this.prisma?.nation?.findUnique?.({ where: { id: attackerId } })) ?? { id: attackerId, name: 'Attacker', playerId: attackerId }
      const defender = (await this.prisma?.nation?.findUnique?.({ where: { id: defenderId } })) ?? { id: defenderId, name: 'Defender', playerId: defenderId }

      if (result.winner === 'ATTACKER') {
        this.gateway?.server?.to(attacker.playerId)?.emit('battle:victory', {
          title: '🎉 胜利！',
          message: `您的军队成功击败了${defender.name}的守军！`,
          losses: result.attackerLosses,
          enemyLosses: result.defenderLosses,
          territoryGained: result.territoryStatus === 'CAPTURED',
          showCelebration: true,
        })
      } else {
        this.gateway?.server?.to(attacker.playerId)?.emit('battle:defeat', {
          title: '💔 战斗失败',
          message: `您的军队在战斗中失利...`,
          losses: result.attackerLosses,
          enemyLosses: result.defenderLosses,
          showDramaticLoss: true,
        })
      }

      if (result.winner === 'DEFENDER') {
        this.gateway?.server?.to(defender.playerId)?.emit('battle:defensiveVictory', {
          title: '🛡️ 成功防守！',
          message: `您的守军击退了${attacker.name}的进攻！`,
          losses: result.defenderLosses,
          enemyLosses: result.attackerLosses,
          showDefensiveBonus: true,
        })
      } else {
        this.gateway?.server?.to(defender.playerId)?.emit('territory:lost', {
          title: '⚠️ 领土沦陷！',
          message: `${attacker.name}占领了您的领土！`,
          losses: result.defenderLosses,
          territoryLost: true,
          showUrgentAlert: true,
          playAlarmSound: true,
        })
      }
    } catch {
      // ignore in stub
    }
  }

  private async getGeneralBonus(generalId: string | undefined, mode: BattleSide): Promise<number> {
    if (!generalId) return 1
    try {
      const general = await this.prisma?.general?.findUnique?.({ where: { id: generalId } })
      if (!general) return 1
      const base = mode === 'ATTACK' ? (general.attack ?? 0) : (general.defense ?? 0)
      let bonus = 1 + Math.max(0, base) / 100 // 1% per point as baseline

      // Traits modifiers
      const traits: string[] = Array.isArray(general.traits) ? general.traits : []
      for (const t of traits) {
        if (t === 'AGGRESSIVE' && mode === 'ATTACK') bonus *= 1.2
        if (t === 'DEFENSIVE_MASTER' && mode === 'DEFENSE') bonus *= 1.3
        if (t === 'GUERRILLA_EXPERT') bonus *= 1.05
        if (t === 'LOGISTICIAN') bonus *= 1.05
        if (t === 'INSPIRING') bonus *= 1.1
      }
      return Math.max(0.7, Math.min(1.8, bonus))
    } catch {
      return 1
    }
  }

  private async getUnitsInTerritory(nationId: string, territoryId: string): Promise<MilitaryUnit[]> {
    try {
      const units = await this.prisma?.militaryUnit?.findMany?.({
        where: { nationId, territoryId },
      })
      return units ?? []
    } catch {
      return []
    }
  }
}

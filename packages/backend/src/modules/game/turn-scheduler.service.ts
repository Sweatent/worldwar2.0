import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import {
  GameTurnState,
  Nation,
  ResourceBag,
  TurnPhase,
} from '@/common/types/game.types'
import { GameStateService } from '@/modules/game/game-state.service'

@Injectable()
export class TurnSchedulerService {
  private readonly phases: TurnPhase[] = ['ECONOMY', 'DIPLOMACY', 'MILITARY', 'TECH', 'EVENTS']
  private activeGames: Map<string, GameTurnState> = new Map()

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gameStateService: GameStateService,
  ) {}

  async startGameScheduler(roomId: string, gameMode: string) {
    const turnDuration = this.getTurnDuration(gameMode)
    const turnState: GameTurnState = {
      roomId,
      currentTurn: 1,
      phase: 'ECONOMY',
      turnStartTime: Date.now(),
      turnDuration,
      playerActions: new Map(),
      active: true,
      paused: false,
      gameSpeed: 1,
    }
    this.activeGames.set(roomId, turnState)
    this.runTurnLoop(roomId).catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Turn loop stopped unexpectedly', error)
      this.activeGames.delete(roomId)
    })
  }

  async updateGameSpeed(roomId: string, speed: number) {
    const turnState = this.activeGames.get(roomId)
    if (turnState) {
      turnState.gameSpeed = speed
    }
  }

  async pauseGame(roomId: string) {
    const turnState = this.activeGames.get(roomId)
    if (turnState) {
      turnState.paused = true
    }
  }

  async resumeGame(roomId: string) {
    const turnState = this.activeGames.get(roomId)
    if (turnState) {
      turnState.paused = false
    }
  }

  async recordPlayerAction(roomId: string, playerId: string, phase: TurnPhase, payload: any) {
    const turnState = this.activeGames.get(roomId)
    if (!turnState) return
    turnState.playerActions.set(`${playerId}:${phase}`, payload)
  }

  private async runTurnLoop(roomId: string) {
    const turnState = this.activeGames.get(roomId)
    if (!turnState) return

    while (turnState.active) {
      await this.waitIfPaused(turnState)
      if (await this.checkGameOver(roomId)) {
        turnState.active = false
        break
      }

      const currentPhase = turnState.phase
      await this.executePhase(roomId, currentPhase)
      await this.waitForPhaseCompletion(roomId, turnState, currentPhase)
      this.clearPhaseActions(turnState, currentPhase)

      const nextPhase = this.getNextPhase(currentPhase)
      turnState.phase = nextPhase

      if (nextPhase === 'ECONOMY') {
        turnState.currentTurn += 1
        turnState.turnStartTime = Date.now()
        await this.onNewTurn(roomId, turnState.currentTurn)
      }
    }

    this.activeGames.delete(roomId)
  }

  private async executePhase(roomId: string, phase: TurnPhase) {
    switch (phase) {
      case 'ECONOMY':
        await this.executeEconomyPhase(roomId)
        break
      case 'DIPLOMACY':
        await this.executeDiplomacyPhase(roomId)
        break
      case 'MILITARY':
        await this.executeMilitaryPhase(roomId)
        break
      case 'TECH':
        await this.executeTechPhase(roomId)
        break
      case 'EVENTS':
        await this.executeEventsPhase(roomId)
        break
    }
    this.eventEmitter.emit('game.phaseCompleted', { roomId, phase })
  }

  private async executeEconomyPhase(roomId: string) {
    const nations = await this.prisma.nation.findMany({
      where: { gameRoomId: roomId },
      include: { territories: true },
    })
    for (const nation of nations as unknown as Nation[]) {
      const production = this.calculateResourceProduction(nation)
      const newResources = this.addResources(nation.resources, production)
      await this.prisma.nation.update({
        where: { id: nation.id },
        data: { resources: newResources },
      })
      this.eventEmitter.emit('nation.resourcesUpdated', {
        nationId: nation.id,
        production,
        showAnimation: true,
      })
    }
    await this.gameStateService.createSnapshot(roomId, 'ECONOMY')
  }

  private async executeDiplomacyPhase(roomId: string) {
    const nations = await this.prisma.nation.findMany({ where: { gameRoomId: roomId } })
    for (const nation of nations as unknown as Nation[]) {
      for (const partner of nations as unknown as Nation[]) {
        if (nation.id === partner.id) continue
        const relation = nation.diplomaticRelations.find((item) => item.withNationId === partner.id)
        if (!relation) {
          nation.diplomaticRelations.push({
            id: `${nation.id}:${partner.id}`,
            withNationId: partner.id,
            status: 'NEUTRAL',
          })
        }
      }
      await this.prisma.nation.update({ where: { id: nation.id }, data: nation })
    }
  }

  private async executeMilitaryPhase(roomId: string) {
    const actions = await this.redis.lrange<string>(`game:room:${roomId}:military_actions`, 0, -1)
    for (const actionStr of actions) {
      const action = JSON.parse(actionStr)
      await this.processMilitaryAction(action)
    }
    await this.redis.del(`game:room:${roomId}:military_actions`)
  }

  private async executeTechPhase(roomId: string) {
    const nations = await this.prisma.nation.findMany({ where: { gameRoomId: roomId } })
    for (const nation of nations as unknown as Nation[]) {
      const researching = nation.technologies.find((tech) => tech.status === 'IN_PROGRESS')
      if (researching) {
        researching.status = 'COMPLETED'
      } else {
        nation.technologies.push({
          id: `${nation.id}-tech-${Date.now()}`,
          name: 'Adaptive Logistics',
          status: 'COMPLETED',
        })
      }
      await this.prisma.nation.update({ where: { id: nation.id }, data: nation })
    }
  }

  private async executeEventsPhase(roomId: string) {
    await this.redis.rpush(
      `game:room:${roomId}:events`,
      JSON.stringify({ type: 'MORALE_BOOST', createdAt: Date.now() }),
    )
    await this.prisma.gameEvent.create({
      data: {
        gameRoomId: roomId,
        type: 'MORALE_BOOST',
        payload: { bonus: 0.05 },
      },
    })
    await this.gameStateService.createSnapshot(roomId, 'EVENTS')
  }

  private async waitForPhaseCompletion(
    roomId: string,
    turnState: GameTurnState,
    phase: TurnPhase,
  ) {
    const basePhaseDuration = turnState.turnDuration / this.phases.length
    const phaseTimeout = basePhaseDuration / Math.max(turnState.gameSpeed, 1)
    const interval = Math.max(100, Math.floor(phaseTimeout / 5))
    const start = Date.now()

    while (Date.now() - start < phaseTimeout) {
      await this.waitIfPaused(turnState)
      if (await this.checkAllPlayersSubmitted(roomId, phase)) {
        break
      }
      await this.delay(interval)
    }
  }

  private async onNewTurn(roomId: string, turn: number) {
    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { currentTurn: turn },
    })
    await this.gameStateService.createSnapshot(roomId, 'ECONOMY')
    await this.triggerRandomEvents(roomId)
    this.eventEmitter.emit('game.newTurn', { roomId, turn })
  }

  private async checkGameOver(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({ where: { id: roomId } })
    if (!room) return true
    return room.status === 'COMPLETED'
  }

  private getTurnDuration(gameMode: string): number {
    switch (gameMode) {
      case 'LIGHTNING':
        return 60_000
      case 'EPIC':
        return 300_000
      case 'STANDARD':
      default:
        return 120_000
    }
  }

  private getNextPhase(current: TurnPhase): TurnPhase {
    const index = this.phases.indexOf(current)
    const nextIndex = (index + 1) % this.phases.length
    return this.phases[nextIndex]
  }

  private async checkAllPlayersSubmitted(roomId: string, phase: TurnPhase) {
    const players = await this.prisma.getRoomPlayers(roomId)
    if (players.length === 0) return true
    const turnState = this.activeGames.get(roomId)
    if (!turnState) return true
    const submitted = players.every((player) =>
      turnState.playerActions.has(`${player.playerId}:${phase}`),
    )
    return submitted
  }

  private async triggerRandomEvents(roomId: string) {
    const events = [{ type: 'RESOURCE_BONUS', payload: { resource: 'food', amount: 5 } }]
    for (const event of events) {
      await this.prisma.gameEvent.create({
        data: {
          gameRoomId: roomId,
          type: event.type,
          payload: event.payload,
        },
      })
    }
  }

  private calculateResourceProduction(nation: Nation): ResourceBag {
    const base: ResourceBag = { food: 5, industry: 4, science: 3, culture: 2 }
    for (const territory of nation.territories) {
      base.food += territory.resourceYield.food
      base.industry += territory.resourceYield.industry
      base.science += territory.resourceYield.science
      base.culture += territory.resourceYield.culture
    }
    return base
  }

  private addResources(current: ResourceBag, production: ResourceBag): ResourceBag {
    return {
      food: current.food + production.food,
      industry: current.industry + production.industry,
      science: current.science + production.science,
      culture: current.culture + production.culture,
    }
  }

  private async processMilitaryAction(action: any) {
    if (action.type === 'ATTACK') {
      await this.redis.rpush(
        `game:room:${action.roomId}:events`,
        JSON.stringify({
          type: 'BATTLE_RESOLUTION',
          attacker: action.attacker,
          defender: action.defender,
          outcome: action.outcome ?? 'SUCCESS',
          createdAt: Date.now(),
        }),
      )
    }
  }

  private clearPhaseActions(turnState: GameTurnState, phase: TurnPhase) {
    for (const key of turnState.playerActions.keys()) {
      if (key.endsWith(`:${phase}`)) {
        turnState.playerActions.delete(key)
      }
    }
  }

  private async waitIfPaused(turnState: GameTurnState) {
    while (turnState.paused && turnState.active) {
      await this.delay(100)
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }
}

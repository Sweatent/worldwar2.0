import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/common/services/prisma.service'
import { RedisService } from '@/common/services/redis.service'
import {
  GameStateSnapshot,
  SerializedNation,
  TurnPhase,
} from '@/common/types/game.types'

@Injectable()
export class GameStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createSnapshot(roomId: string, phase: TurnPhase): Promise<string> {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        players: true,
        nations: {
          include: {
            territories: true,
            units: true,
            technologies: true,
            diplomaticRelations: true,
          },
        },
      },
    })
    if (!room) throw new NotFoundException('Room not found')

    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      turn: room.currentTurn,
      phase,
      nations: room.nations.map((nation: any) => this.serializeNation(nation)),
      events: await this.getRecentEvents(roomId),
    }

    const gameState = await this.prisma.gameState.upsert({
      where: { gameRoomId: roomId },
      create: {
        gameRoomId: roomId,
        stateData: snapshot,
        turn: room.currentTurn,
        phase,
      },
      update: {
        stateData: snapshot,
        turn: room.currentTurn,
        phase,
      },
    })

    await this.prisma.gameStateHistory.create({
      data: {
        gameRoomId: roomId,
        stateData: snapshot,
        turn: room.currentTurn,
        phase,
      },
    })

    await this.redis.set(`game:room:${roomId}:state`, snapshot, 3600)

    return gameState.id
  }

  async restoreSnapshot(roomId: string): Promise<GameStateSnapshot> {
    const cached = await this.redis.get<GameStateSnapshot>(`game:room:${roomId}:state`)
    if (cached) return cached

    const fromDb = await this.prisma.gameState.findUnique({ where: { gameRoomId: roomId } })
    if (!fromDb) throw new NotFoundException('Game state not found')

    await this.redis.set(`game:room:${roomId}:state`, fromDb.stateData, 3600)
    return fromDb.stateData
  }

  async getHistoricalSnapshots(roomId: string) {
    const snapshots = await this.prisma.gameStateHistory.findMany({
      where: { gameRoomId: roomId },
      orderBy: { turn: 'asc' },
    })
    return snapshots.map((snapshot) => ({
      turn: snapshot.turn,
      timestamp: snapshot.createdAt.getTime(),
      preview: this.generateSnapshotPreview(snapshot.stateData),
    }))
  }

  async calculateStateDiff(roomId: string, fromTurn: number, toTurn: number) {
    const fromState = await this.getSnapshotByTurn(roomId, fromTurn)
    const toState = await this.getSnapshotByTurn(roomId, toTurn)

    return {
      resourceChanges: this.diffResources(fromState, toState),
      territoryChanges: this.diffTerritories(fromState, toState),
      diplomaticChanges: this.diffDiplomacy(fromState, toState),
      losses: this.highlightLosses(fromState, toState),
      gains: this.highlightGains(fromState, toState),
    }
  }

  private async getSnapshotByTurn(roomId: string, turn: number): Promise<GameStateSnapshot> {
    const history = await this.prisma.gameStateHistory.findMany({
      where: { gameRoomId: roomId },
      orderBy: { turn: 'asc' },
    })
    const match = history.find((entry) => entry.turn === turn)
    if (match) return match.stateData

    const latest = await this.prisma.gameState.findUnique({ where: { gameRoomId: roomId } })
    if (latest && latest.turn === turn) return latest.stateData

    throw new NotFoundException(`Snapshot for turn ${turn} not found`)
  }

  private async getRecentEvents(roomId: string) {
    const events = await this.prisma.gameEvent.findMany({
      where: { gameRoomId: roomId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    return events.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt.getTime(),
    }))
  }

  private serializeNation(nation: any): SerializedNation {
    return {
      id: nation.id,
      name: nation.name,
      playerId: nation.playerId,
      resources: nation.resources,
      stability: nation.stability,
      cohesion: nation.cohesion,
      population: nation.population.toString(),
      territories: nation.territories.map((territory: any) => territory.id),
      units: nation.units.length,
      technologies: nation.technologies.filter((t: any) => t.status === 'COMPLETED').length,
      diplomaticRelations: nation.diplomaticRelations.map((relation: any) => ({
        withNationId: relation.withNationId,
        status: relation.status,
      })),
    }
  }

  private generateSnapshotPreview(snapshot: GameStateSnapshot) {
    return {
      turn: snapshot.turn,
      nationSummaries: snapshot.nations.map((nation) => ({
        id: nation.id,
        name: nation.name,
        resources: nation.resources,
      })),
    }
  }

  private diffResources(fromState: GameStateSnapshot, toState: GameStateSnapshot) {
    const diff = [] as Array<{
      nationId: string
      changes: Record<string, number>
    }>
    for (const nation of toState.nations) {
      const previous = fromState.nations.find((item) => item.id === nation.id)
      if (!previous) continue
      const changes: Record<string, number> = {
        food: nation.resources.food - previous.resources.food,
        industry: nation.resources.industry - previous.resources.industry,
        science: nation.resources.science - previous.resources.science,
        culture: nation.resources.culture - previous.resources.culture,
      }
      diff.push({ nationId: nation.id, changes })
    }
    return diff
  }

  private diffTerritories(fromState: GameStateSnapshot, toState: GameStateSnapshot) {
    return toState.nations.map((nation) => {
      const previous = fromState.nations.find((item) => item.id === nation.id)
      const previousTerritories = new Set(previous?.territories ?? [])
      const currentTerritories = new Set(nation.territories)
      const gained = nation.territories.filter((id) => !previousTerritories.has(id))
      const lost = (previous?.territories ?? []).filter((id) => !currentTerritories.has(id))
      return { nationId: nation.id, gained, lost }
    })
  }

  private diffDiplomacy(fromState: GameStateSnapshot, toState: GameStateSnapshot) {
    return toState.nations.map((nation) => {
      const previous = fromState.nations.find((n) => n.id === nation.id)
      const previousMap = new Map(
        (previous?.diplomaticRelations ?? []).map((relation) => [relation.withNationId, relation.status]),
      )
      const currentMap = new Map(
        nation.diplomaticRelations.map((relation) => [relation.withNationId, relation.status]),
      )

      const newRelations: Array<{ withNationId: string; status: string }> = []
      const statusChanges: Array<{ withNationId: string; from: string | null; to: string }> = []
      for (const [withNationId, status] of currentMap.entries()) {
        if (!previousMap.has(withNationId)) {
          newRelations.push({ withNationId, status })
        } else if (previousMap.get(withNationId) !== status) {
          statusChanges.push({
            withNationId,
            from: previousMap.get(withNationId) ?? null,
            to: status,
          })
        }
      }

      const endedRelations: Array<{ withNationId: string; status: string | null }> = []
      for (const [withNationId, status] of previousMap.entries()) {
        if (!currentMap.has(withNationId)) {
          endedRelations.push({ withNationId, status })
        }
      }

      return { nationId: nation.id, newRelations, statusChanges, endedRelations }
    })
  }

  private highlightLosses(fromState: GameStateSnapshot, toState: GameStateSnapshot) {
    return this.diffResources(fromState, toState).map((diff) => ({
      nationId: diff.nationId,
      losses: Object.entries(diff.changes)
        .filter(([, value]) => value < 0)
        .map(([resource, value]) => ({ resource, value })),
    }))
  }

  private highlightGains(fromState: GameStateSnapshot, toState: GameStateSnapshot) {
    return this.diffResources(fromState, toState).map((diff) => ({
      nationId: diff.nationId,
      gains: Object.entries(diff.changes)
        .filter(([, value]) => value > 0)
        .map(([resource, value]) => ({ resource, value })),
    }))
  }
}

import { v4 as uuid } from 'uuid'
import {
  DiplomaticRelation,
  GameEventRecord,
  GameRoom,
  GameRoomPlayer,
  GameStateHistoryRecord,
  GameStateRecord,
  Nation,
  Player,
  PlayerCreateInput,
  ResourceBag,
  TurnPhase,
} from '@/common/types/game.types'

function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') {
      return BigInt(value.toString()) as unknown as T
    }
    return value
  }
  if (value instanceof Date) {
    return new Date(value.getTime()) as unknown as T
  }
  if (Array.isArray(value)) {
    return (value.map((item) => clone(item)) as unknown) as T
  }
  const cloned: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    cloned[key] = clone(val)
  }
  return cloned as T
}

export class PrismaService {
  private players: Player[] = []
  private gameRooms: GameRoom[] = []
  private gameRoomPlayers: GameRoomPlayer[] = []
  private nations: Nation[] = []
  private gameStates: GameStateRecord[] = []
  private gameStateHistoryRecords: GameStateHistoryRecord[] = []
  private gameEvents: GameEventRecord[] = []

  // Utility helpers
  reset() {
    this.players = []
    this.gameRooms = []
    this.gameRoomPlayers = []
    this.nations = []
    this.gameStates = []
    this.gameStateHistoryRecords = []
    this.gameEvents = []
  }

  private ensureResourceBag(resources?: Partial<ResourceBag>): ResourceBag {
    return {
      food: resources?.food ?? 0,
      industry: resources?.industry ?? 0,
      science: resources?.science ?? 0,
      culture: resources?.culture ?? 0,
    }
  }

  player = {
    create: async ({ data }: { data: PlayerCreateInput }): Promise<Player> => {
      const record: Player = {
        ...data,
        id: uuid(),
        createdAt: new Date(),
      }
      this.players.push(record)
      return clone(record)
    },
    findUnique: async ({ where }: { where: Partial<Pick<Player, 'id' | 'email'>> }): Promise<Player | null> => {
      const { id, email } = where
      const result = this.players.find((player) =>
        id ? player.id === id : email ? player.email === email : false,
      )
      return result ? clone(result) : null
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Player> }): Promise<Player> => {
      const idx = this.players.findIndex((player) => player.id === where.id)
      if (idx === -1) throw new Error('Player not found')
      const updated: Player = {
        ...this.players[idx],
        ...data,
      }
      this.players[idx] = updated
      return clone(updated)
    },
  }

  gameRoom = {
    create: async ({ data }: { data: Omit<GameRoom, 'id' | 'createdAt' | 'currentTurn'> }): Promise<GameRoom> => {
      const record: GameRoom = {
        ...data,
        id: uuid(),
        createdAt: new Date(),
        currentTurn: 1,
      }
      this.gameRooms.push(record)
      return clone(record)
    },
    findUnique: async ({
      where,
      include,
    }: {
      where: Partial<Pick<GameRoom, 'id' | 'roomCode'>>
      include?: {
        players?: boolean
        nations?: {
          include?: {
            territories?: boolean
            units?: boolean
            technologies?: boolean
            diplomaticRelations?: boolean
          }
        }
      }
    }): Promise<any> => {
      const { id, roomCode } = where
      const room = this.gameRooms.find((entry) =>
        id ? entry.id === id : roomCode ? entry.roomCode === roomCode : false,
      )
      if (!room) return null

      const payload: any = clone(room)
      if (include?.players) {
        payload.players = this.gameRoomPlayers
          .filter((grp) => grp.gameRoomId === room.id)
          .map((grp) => clone(grp))
      }
      if (include?.nations) {
        const includeOpts = include.nations.include ?? {}
        payload.nations = this.nations
          .filter((nation) => nation.gameRoomId === room.id)
          .map((nation) => {
            const cloned = clone(nation)
            return {
              ...cloned,
              territories: includeOpts.territories ? cloned.territories : [],
              units: includeOpts.units ? cloned.units : [],
              technologies: includeOpts.technologies ? cloned.technologies : [],
              diplomaticRelations: includeOpts.diplomaticRelations
                ? cloned.diplomaticRelations
                : [],
            }
          })
      }
      return payload
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<GameRoom> }): Promise<GameRoom> => {
      const idx = this.gameRooms.findIndex((room) => room.id === where.id)
      if (idx === -1) throw new Error('Room not found')
      const updated: GameRoom = { ...this.gameRooms[idx], ...data }
      this.gameRooms[idx] = updated
      return clone(updated)
    },
  }

  gameRoomPlayer = {
    create: async ({ data }: { data: Omit<GameRoomPlayer, 'id' | 'joinedAt'> }): Promise<GameRoomPlayer> => {
      const record: GameRoomPlayer = {
        ...data,
        id: uuid(),
        joinedAt: new Date(),
      }
      this.gameRoomPlayers.push(record)
      return clone(record)
    },
    findFirst: async ({ where }: { where: Partial<GameRoomPlayer> }): Promise<GameRoomPlayer | null> => {
      const result = this.gameRoomPlayers.find((entry) => {
        return Object.entries(where).every(([key, value]) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry as any)[key] === value,
        )
      })
      return result ? clone(result) : null
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<GameRoomPlayer> }): Promise<GameRoomPlayer> => {
      const idx = this.gameRoomPlayers.findIndex((entry) => entry.id === where.id)
      if (idx === -1) throw new Error('Room player not found')
      const updated = { ...this.gameRoomPlayers[idx], ...data }
      this.gameRoomPlayers[idx] = updated
      return clone(updated)
    },
    findMany: async ({ where }: { where: Partial<GameRoomPlayer> }): Promise<GameRoomPlayer[]> => {
      return this.gameRoomPlayers
        .filter((entry) =>
          Object.entries(where).every(([key, value]) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (entry as any)[key] === value,
          ),
        )
        .map((entry) => clone(entry))
    },
  }

  nation = {
    create: async ({ data }: { data: Omit<Nation, 'id'> }): Promise<Nation> => {
      const record: Nation = {
        ...data,
        id: uuid(),
        resources: this.ensureResourceBag(data.resources),
        territories: data.territories ?? [],
        units: data.units ?? [],
        technologies: data.technologies ?? [],
        diplomaticRelations: data.diplomaticRelations ?? [],
      }
      this.nations.push(record)
      return clone(record)
    },
    findMany: async ({
      where,
      include,
    }: {
      where?: Partial<Pick<Nation, 'gameRoomId' | 'playerId'>>
      include?: {
        territories?: boolean
        units?: boolean
        technologies?: boolean
        diplomaticRelations?: boolean
      }
    }): Promise<Nation[]> => {
      const list = this.nations.filter((nation) => {
        if (!where) return true
        return Object.entries(where).every(([key, value]) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (nation as any)[key] === value,
        )
      })
      return list.map((nation) => {
        const cloned = clone(nation)
        return {
          ...cloned,
          territories: include?.territories ? cloned.territories : [],
          units: include?.units ? cloned.units : [],
          technologies: include?.technologies ? cloned.technologies : [],
          diplomaticRelations: include?.diplomaticRelations
            ? cloned.diplomaticRelations
            : [],
        }
      })
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Nation> }): Promise<Nation> => {
      const idx = this.nations.findIndex((nation) => nation.id === where.id)
      if (idx === -1) throw new Error('Nation not found')
      const updated = {
        ...this.nations[idx],
        ...data,
        resources: data.resources
          ? this.ensureResourceBag(data.resources as ResourceBag)
          : this.nations[idx].resources,
      }
      this.nations[idx] = updated
      return clone(updated)
    },
  }

  gameState = {
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { gameRoomId: string }
      create: Omit<GameStateRecord, 'id' | 'savedAt'>
      update: Partial<Omit<GameStateRecord, 'id' | 'gameRoomId'>>
    }): Promise<GameStateRecord> => {
      const existingIdx = this.gameStates.findIndex(
        (record) => record.gameRoomId === where.gameRoomId,
      )
      if (existingIdx === -1) {
        const record: GameStateRecord = {
          id: uuid(),
          ...create,
          savedAt: new Date(),
        }
        this.gameStates.push(record)
        return clone(record)
      }
      const updated: GameStateRecord = {
        ...this.gameStates[existingIdx],
        ...update,
        savedAt: new Date(),
      }
      this.gameStates[existingIdx] = updated
      return clone(updated)
    },
    findUnique: async ({ where }: { where: { gameRoomId: string } }): Promise<GameStateRecord | null> => {
      const record = this.gameStates.find((entry) => entry.gameRoomId === where.gameRoomId)
      return record ? clone(record) : null
    },
  }

  gameStateHistory = {
    create: async ({ data }: { data: Omit<GameStateHistoryRecord, 'id' | 'createdAt'> }): Promise<GameStateHistoryRecord> => {
      const record: GameStateHistoryRecord = {
        ...data,
        id: uuid(),
        createdAt: new Date(),
      }
      this.gameStateHistoryRecords.push(record)
      return clone(record)
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { gameRoomId: string }
      orderBy?: { turn: 'asc' | 'desc' }
    }): Promise<GameStateHistoryRecord[]> => {
      const list = this.gameStateHistoryRecords.filter((entry) => entry.gameRoomId === where.gameRoomId)
      if (orderBy?.turn === 'asc') {
        list.sort((a, b) => a.turn - b.turn)
      } else if (orderBy?.turn === 'desc') {
        list.sort((a, b) => b.turn - a.turn)
      }
      return list.map((entry) => clone(entry))
    },
  }

  gameEvent = {
    create: async ({ data }: { data: Omit<GameEventRecord, 'id' | 'createdAt'> }): Promise<GameEventRecord> => {
      const record: GameEventRecord = {
        ...data,
        id: uuid(),
        createdAt: new Date(),
      }
      this.gameEvents.push(record)
      return clone(record)
    },
    findMany: async ({ where, orderBy, take }: { where: { gameRoomId: string }; orderBy?: { createdAt: 'desc' | 'asc' }; take?: number }): Promise<GameEventRecord[]> => {
      let list = this.gameEvents.filter((entry) => entry.gameRoomId === where.gameRoomId)
      if (orderBy?.createdAt === 'desc') {
        list = list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      } else if (orderBy?.createdAt === 'asc') {
        list = list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      }
      if (typeof take === 'number') {
        list = list.slice(0, take)
      }
      return list.map((entry) => clone(entry))
    },
    deleteMany: async ({ where }: { where: { gameRoomId: string } }): Promise<void> => {
      this.gameEvents = this.gameEvents.filter((entry) => entry.gameRoomId !== where.gameRoomId)
    },
  }

  async getRoomPlayers(roomId: string): Promise<GameRoomPlayer[]> {
    return this.gameRoomPlayers
      .filter((player) => player.gameRoomId === roomId)
      .map((player) => clone(player))
  }

  async getNationByPlayer(roomId: string, playerId: string): Promise<Nation | null> {
    const nation = this.nations.find(
      (entry) => entry.gameRoomId === roomId && entry.playerId === playerId,
    )
    return nation ? clone(nation) : null
  }

  async upsertDiplomaticRelation(
    nationId: string,
    relation: DiplomaticRelation,
  ): Promise<void> {
    const idx = this.nations.findIndex((nation) => nation.id === nationId)
    if (idx === -1) return
    const existingIdx = this.nations[idx].diplomaticRelations.findIndex(
      (entry) => entry.withNationId === relation.withNationId,
    )
    if (existingIdx === -1) {
      this.nations[idx].diplomaticRelations.push(relation)
    } else {
      this.nations[idx].diplomaticRelations[existingIdx] = relation
    }
  }

  async markGameCompleted(roomId: string): Promise<void> {
    const idx = this.gameRooms.findIndex((room) => room.id === roomId)
    if (idx === -1) return
    this.gameRooms[idx].status = 'COMPLETED'
  }

  async saveHistoricalSnapshot(snapshot: GameStateHistoryRecord): Promise<void> {
    this.gameStateHistoryRecords.push(snapshot)
  }
}

export interface Point {
  x: number
  y: number
}

export interface Polygon {
  points: number[]
}

export enum TerrainType {
  PLAINS = 'PLAINS',
  MOUNTAIN = 'MOUNTAIN',
  FOREST = 'FOREST',
  DESERT = 'DESERT',
  JUNGLE = 'JUNGLE',
  WATER = 'WATER',
  URBAN = 'URBAN',
}

export enum UnitType {
  INFANTRY = 'INFANTRY',
  MECHANIZED_INFANTRY = 'MECHANIZED_INFANTRY',
  TANK = 'TANK',
  ARTILLERY = 'ARTILLERY',
  AIRCRAFT = 'AIRCRAFT',
  RECONNAISSANCE = 'RECONNAISSANCE',
  ANTI_AIR = 'ANTI_AIR',
}

export interface City {
  id: string
  name: string
  position: Point
  population: number
  isCapital?: boolean
}

export interface Territory {
  id: string
  name: string
  type: TerrainType
  polygon: number[]
  position: Point
  ownerId: string | null
  resources: {
    food: number
    metal: number
    oil: number
    rare: number
  }
  population: number
  neighbors: string[]
  cities?: City[]
  activeMovements?: Movement[]
}

export interface MilitaryUnit {
  id: string
  type: UnitType
  nationId: string
  territoryId: string
  position: Point
  strength: number
  experience: number
  training: number
  equipment: number
  morale: number
  supply: number
}

export interface Nation {
  id: string
  name: string
  color: number
  flag: string
  territories: Territory[]
  units: MilitaryUnit[]
  resources: {
    food: number
    metal: number
    oil: number
    rare: number
    manpower: number
  }
  isPlayer: boolean
}

export interface Battle {
  id: string
  territoryId: string
  territory: Territory
  attackerId: string
  defenderId: string
  attacker: Nation
  defender: Nation
  attackerUnits: MilitaryUnit[]
  defenderUnits: MilitaryUnit[]
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED'
  currentRound: number
  maxRounds: number
  battleLog: BattleRound[]
  result?: BattleResult
}

export interface BattleRound {
  roundNumber: number
  attackerUnits: MilitaryUnit[]
  defenderUnits: MilitaryUnit[]
  attackerDamage: number
  defenderDamage: number
  casualties: {
    attacker: number
    defender: number
  }
}

export interface BattleResult {
  winner: string
  attackerCasualties: number
  defenderCasualties: number
  territoryChanged: boolean
}

export interface Movement {
  unitId: string
  path: PathNode[]
  progress: number
  startTime: number
  estimatedArrival: number
}

export interface PathNode {
  territory: Territory
  g: number
  h: number
  f: number
  parent: PathNode | null
}

export interface Region {
  id: string
  name: string
  territories: Territory[]
}

export interface GameState {
  nations: Nation[]
  territories: Territory[]
  regions?: Region[]
  battles: Battle[]
  movements: Movement[]
  currentTurn: number
  currentPlayerId: string
}

export interface UnitDefinition {
  type: UnitType
  name: string
  cost: {
    metal: number
    oil?: number
    manpower: number
  }
  stats: {
    attack: number
    defense: number
    speed: number
    range: number
  }
  terrain: Partial<Record<TerrainType, number>>
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  [UnitType.INFANTRY]: {
    type: UnitType.INFANTRY,
    name: '步兵',
    cost: { metal: 10, manpower: 100 },
    stats: { attack: 10, defense: 15, speed: 3, range: 1 },
    terrain: {
      [TerrainType.PLAINS]: 1.0,
      [TerrainType.MOUNTAIN]: 0.7,
      [TerrainType.FOREST]: 1.2,
      [TerrainType.URBAN]: 1.3,
    },
  },
  [UnitType.MECHANIZED_INFANTRY]: {
    type: UnitType.MECHANIZED_INFANTRY,
    name: '机械化步兵',
    cost: { metal: 25, oil: 5, manpower: 80 },
    stats: { attack: 15, defense: 20, speed: 5, range: 1 },
    terrain: {
      [TerrainType.PLAINS]: 1.2,
      [TerrainType.MOUNTAIN]: 0.6,
      [TerrainType.FOREST]: 0.8,
      [TerrainType.DESERT]: 1.1,
    },
  },
  [UnitType.TANK]: {
    type: UnitType.TANK,
    name: '坦克',
    cost: { metal: 50, oil: 10, manpower: 50 },
    stats: { attack: 30, defense: 25, speed: 4, range: 1 },
    terrain: {
      [TerrainType.PLAINS]: 1.3,
      [TerrainType.MOUNTAIN]: 0.4,
      [TerrainType.FOREST]: 0.6,
      [TerrainType.DESERT]: 0.9,
    },
  },
  [UnitType.ARTILLERY]: {
    type: UnitType.ARTILLERY,
    name: '炮兵',
    cost: { metal: 30, manpower: 60 },
    stats: { attack: 25, defense: 5, speed: 2, range: 3 },
    terrain: {
      [TerrainType.PLAINS]: 1.2,
      [TerrainType.MOUNTAIN]: 0.5,
      [TerrainType.FOREST]: 0.7,
    },
  },
  [UnitType.AIRCRAFT]: {
    type: UnitType.AIRCRAFT,
    name: '战斗机',
    cost: { metal: 80, oil: 20, manpower: 30 },
    stats: { attack: 40, defense: 10, speed: 10, range: 5 },
    terrain: {
      [TerrainType.PLAINS]: 1.0,
      [TerrainType.MOUNTAIN]: 0.9,
      [TerrainType.FOREST]: 0.8,
    },
  },
  [UnitType.RECONNAISSANCE]: {
    type: UnitType.RECONNAISSANCE,
    name: '侦察兵',
    cost: { metal: 15, manpower: 50 },
    stats: { attack: 5, defense: 8, speed: 6, range: 1 },
    terrain: {
      [TerrainType.PLAINS]: 1.1,
      [TerrainType.MOUNTAIN]: 1.0,
      [TerrainType.FOREST]: 1.2,
    },
  },
  [UnitType.ANTI_AIR]: {
    type: UnitType.ANTI_AIR,
    name: '防空炮',
    cost: { metal: 35, manpower: 40 },
    stats: { attack: 20, defense: 10, speed: 2, range: 2 },
    terrain: {
      [TerrainType.PLAINS]: 1.0,
      [TerrainType.MOUNTAIN]: 0.8,
    },
  },
}

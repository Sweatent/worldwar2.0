// Unit definitions and combat modifiers for the military system
// This file is intentionally self-contained and does not import external frameworks

export type TerrainType =
  | 'PLAINS'
  | 'MOUNTAINS'
  | 'FOREST'
  | 'URBAN'
  | 'DESERT'
  | 'JUNGLE'
  | 'COASTAL'
  | string

export type UnitCategory = 'INFANTRY' | 'ARMOR' | 'AIR' | 'NAVAL' | 'SPECIAL' | 'STRATEGIC' | string

export interface UnitStats {
  attack: number
  defense: number
  hp: number
  speed: number
}

export interface UnitDefinition {
  name: string
  category: UnitCategory
  cost: Record<string, number>
  trainTime: number
  stats: UnitStats
  counters?: string[]
  counteredBy?: string[]
  terrain?: Partial<Record<TerrainType, number>>
  supplyConsumption: number
  requiresTech?: string
  specialAbilities?: string[]
}

export const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  // 步兵系列
  MILITIA: {
    name: '民兵',
    category: 'INFANTRY',
    cost: { money: 100, manpower: 100 },
    trainTime: 1, // 回合
    stats: { attack: 5, defense: 8, hp: 100, speed: 3 },
    counters: ['GUERRILLA'], // 克制游击队
    counteredBy: ['ARTILLERY', 'TANK'],
    terrain: { PLAINS: 1.0, MOUNTAINS: 0.8, FOREST: 0.9 },
    supplyConsumption: 1,
  },
  INFANTRY: {
    name: '正规步兵',
    category: 'INFANTRY',
    cost: { money: 300, manpower: 100 },
    trainTime: 2,
    stats: { attack: 15, defense: 20, hp: 150, speed: 4 },
    counters: ['MILITIA', 'GUERRILLA'],
    counteredBy: ['TANK', 'ARTILLERY'],
    terrain: { PLAINS: 1.0, MOUNTAINS: 1.1, FOREST: 1.1, URBAN: 1.2 },
    supplyConsumption: 2,
  },
  
  // 装甲系列
  LIGHT_TANK: {
    name: '轻型坦克',
    category: 'ARMOR',
    cost: { money: 2000, ore: 500, oil: 100 },
    trainTime: 4,
    stats: { attack: 40, defense: 30, hp: 300, speed: 8 },
    counters: ['INFANTRY', 'ARTILLERY'],
    counteredBy: ['HEAVY_TANK', 'ANTI_TANK', 'BOMBER'],
    terrain: { PLAINS: 1.3, MOUNTAINS: 0.5, FOREST: 0.6, DESERT: 1.1 },
    supplyConsumption: 10,
    requiresTech: 'TECH_MECHANIZATION',
  },
  
  HEAVY_TANK: {
    name: '重型坦克',
    category: 'ARMOR',
    cost: { money: 5000, ore: 1500, oil: 300, rareMetals: 50 },
    trainTime: 6,
    stats: { attack: 80, defense: 70, hp: 500, speed: 6 },
    counters: ['LIGHT_TANK', 'INFANTRY', 'FORTIFICATION'],
    counteredBy: ['BOMBER', 'ANTI_TANK'],
    terrain: { PLAINS: 1.4, MOUNTAINS: 0.3, FOREST: 0.5 },
    supplyConsumption: 20,
    requiresTech: 'TECH_ADVANCED_ARMOR',
  },

  // 空军系列
  FIGHTER: {
    name: '战斗机',
    category: 'AIR',
    cost: { money: 8000, ore: 800, oil: 500, rareMetals: 100 },
    trainTime: 5,
    stats: { attack: 50, defense: 20, hp: 100, speed: 20 },
    counters: ['BOMBER', 'FIGHTER'],
    counteredBy: ['JET_FIGHTER', 'AA_GUN'],
    supplyConsumption: 30,
    requiresTech: 'TECH_AVIATION',
  },

  BOMBER: {
    name: '轰炸机',
    category: 'AIR',
    cost: { money: 12000, ore: 1000, oil: 800 },
    trainTime: 6,
    stats: { attack: 100, defense: 10, hp: 150, speed: 15 },
    counters: ['TANK', 'INFANTRY', 'BUILDING', 'INFRASTRUCTURE'],
    counteredBy: ['FIGHTER', 'AA_GUN'],
    supplyConsumption: 50,
    requiresTech: 'TECH_STRATEGIC_BOMBING',
  },

  // 海军系列
  DESTROYER: {
    name: '驱逐舰',
    category: 'NAVAL',
    cost: { money: 10000, ore: 2000, oil: 500 },
    trainTime: 8,
    stats: { attack: 40, defense: 30, hp: 400, speed: 10 },
    counters: ['SUBMARINE', 'TRANSPORT'],
    counteredBy: ['CRUISER', 'BOMBER'],
    supplyConsumption: 40,
    requiresTech: 'TECH_NAVAL_WARFARE',
  },

  BATTLESHIP: {
    name: '战列舰',
    category: 'NAVAL',
    cost: { money: 50000, ore: 10000, oil: 2000 },
    trainTime: 15,
    stats: { attack: 150, defense: 100, hp: 1000, speed: 6 },
    counters: ['CRUISER', 'DESTROYER', 'COASTAL_FORTIFICATION'],
    counteredBy: ['CARRIER', 'SUBMARINE', 'BOMBER'],
    supplyConsumption: 100,
    requiresTech: 'TECH_DREADNOUGHT',
  },

  // 特殊单位
  GUERRILLA: {
    name: '游击队',
    category: 'SPECIAL',
    cost: { money: 50, manpower: 100 },
    trainTime: 1,
    stats: { attack: 10, defense: 5, hp: 80, speed: 6 },
    specialAbilities: ['AMBUSH', 'SABOTAGE', 'HIDE_IN_TERRAIN'],
    counters: ['SUPPLY_LINE', 'INFRASTRUCTURE'],
    counteredBy: ['INFANTRY'],
    terrain: { MOUNTAINS: 1.5, FOREST: 1.5, JUNGLE: 1.8 },
    supplyConsumption: 0.5,
  },

  NUCLEAR_MISSILE: {
    name: '核导弹',
    category: 'STRATEGIC',
    cost: { money: 100000, uranium: 500, rareMetals: 1000 },
    trainTime: 20,
    stats: { attack: 10000, defense: 0, hp: 50, speed: 50 },
    specialAbilities: ['MASS_DESTRUCTION', 'RADIATION', 'DIPLOMATIC_CRISIS'],
    counters: ['ALL_UNITS', 'CITIES', 'INFRASTRUCTURE'],
    counteredBy: ['ANTI_MISSILE_SYSTEM'],
    supplyConsumption: 0,
    requiresTech: 'TECH_NUCLEAR_WEAPONS',
  },
}

// 克制关系矩阵
export const COMBAT_MODIFIERS = {
  INFANTRY_VS_TANK: 0.3, // 步兵对坦克只有30%效率
  TANK_VS_INFANTRY: 2.5, // 坦克对步兵250%效率
  FIGHTER_VS_BOMBER: 2.0,
  BOMBER_VS_GROUND: 1.5,
  ARTILLERY_VS_INFANTRY: 2.0,
  GUERRILLA_VS_SUPPLY: 3.0, // 游击队破坏补给线特别有效
} as const

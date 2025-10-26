import { useEffect } from 'react'
import { MapCanvas } from './components/map/MapCanvas'
import { MultipleBattlesManager } from './components/ui/MultipleBattlesManager'
import { initializeGameState } from './store/gameStore'
import type { Battle, GameState } from './types/game'
import { TerrainType, UnitType } from './types/game'

function generateSampleGameState(): GameState {
  const territories = [
    {
      id: 't1',
      name: '华北平原',
      type: 'PLAINS' as TerrainType,
      polygon: [100, 100, 300, 100, 300, 300, 100, 300],
      position: { x: 200, y: 200 },
      ownerId: 'n1',
      resources: { food: 100, metal: 50, oil: 30, rare: 10 },
      population: 1000000,
      neighbors: ['t2'],
    },
    {
      id: 't2',
      name: '山西高原',
      type: 'MOUNTAIN' as TerrainType,
      polygon: [300, 100, 500, 100, 500, 300, 300, 300],
      position: { x: 400, y: 200 },
      ownerId: 'n2',
      resources: { food: 50, metal: 100, oil: 10, rare: 30 },
      population: 500000,
      neighbors: ['t1', 't3'],
    },
    {
      id: 't3',
      name: '西域沙漠',
      type: 'DESERT' as TerrainType,
      polygon: [500, 100, 700, 100, 700, 300, 500, 300],
      position: { x: 600, y: 200 },
      ownerId: 'n2',
      resources: { food: 20, metal: 40, oil: 80, rare: 20 },
      population: 200000,
      neighbors: ['t2'],
    },
  ]

  const nations = [
    {
      id: 'n1',
      name: '东方联盟',
      color: 0xff0000,
      flag: '🟥',
      territories: [territories[0]],
      units: [
        {
          id: 'u1',
          type: UnitType.INFANTRY,
          nationId: 'n1',
          territoryId: 't1',
          position: { x: 200, y: 200 },
          strength: 100,
          experience: 50,
          training: 80,
          equipment: 3,
          morale: 90,
          supply: 100,
        },
        {
          id: 'u2',
          type: UnitType.TANK,
          nationId: 'n1',
          territoryId: 't1',
          position: { x: 220, y: 220 },
          strength: 50,
          experience: 60,
          training: 85,
          equipment: 4,
          morale: 95,
          supply: 100,
        },
      ],
      resources: {
        food: 1000,
        metal: 500,
        oil: 300,
        rare: 100,
        manpower: 10000,
      },
      isPlayer: true,
    },
    {
      id: 'n2',
      name: '西部帝国',
      color: 0x0000ff,
      flag: '🟦',
      territories: [territories[1], territories[2]],
      units: [
        {
          id: 'u3',
          type: UnitType.MECHANIZED_INFANTRY,
          nationId: 'n2',
          territoryId: 't2',
          position: { x: 400, y: 200 },
          strength: 80,
          experience: 70,
          training: 90,
          equipment: 4,
          morale: 85,
          supply: 100,
        },
      ],
      resources: {
        food: 800,
        metal: 600,
        oil: 400,
        rare: 150,
        manpower: 8000,
      },
      isPlayer: false,
    },
  ]

  const battles: Battle[] = [
    {
      id: 'b1',
      territoryId: 't2',
      territory: territories[1],
      attackerId: 'n1',
      defenderId: 'n2',
      attacker: nations[0],
      defender: nations[1],
      attackerUnits: [nations[0].units[0], nations[0].units[1]],
      defenderUnits: [nations[1].units[0]],
      status: 'ACTIVE',
      currentRound: 3,
      maxRounds: 10,
      battleLog: [
        {
          roundNumber: 1,
          attackerUnits: nations[0].units,
          defenderUnits: nations[1].units,
          attackerDamage: 25,
          defenderDamage: 20,
          casualties: { attacker: 5, defender: 10 },
        },
        {
          roundNumber: 2,
          attackerUnits: nations[0].units,
          defenderUnits: nations[1].units,
          attackerDamage: 30,
          defenderDamage: 18,
          casualties: { attacker: 3, defender: 12 },
        },
        {
          roundNumber: 3,
          attackerUnits: nations[0].units,
          defenderUnits: nations[1].units,
          attackerDamage: 28,
          defenderDamage: 22,
          casualties: { attacker: 4, defender: 11 },
        },
      ],
    },
  ]

  return {
    nations,
    territories,
    battles,
    movements: [],
    currentTurn: 1,
    currentPlayerId: 'n1',
  }
}

export default function App() {
  useEffect(() => {
    const gameState = generateSampleGameState()
    initializeGameState(gameState)
  }, [])

  const handleBattleSelected = (battle: Battle) => {
    console.log('Battle selected:', battle)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900">
      <MapCanvas currentPlayerId="n1" />
      <MultipleBattlesManager onBattleSelected={handleBattleSelected} />
      
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto rounded-lg bg-slate-800/90 px-6 py-4 text-white shadow-2xl">
          <h1 className="text-2xl font-bold">世界大战策略游戏</h1>
          <p className="mt-2 text-sm text-slate-300">
            使用鼠标拖拽和滚轮缩放地图
          </p>
          <p className="mt-1 text-xs text-slate-400">
            战略层 ➜ 区域层 ➜ 战术层
          </p>
        </div>
      </div>
    </div>
  )
}

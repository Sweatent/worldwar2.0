import {
  AchievementRarity,
  BuildingType,
  DiplomaticStatus,
  EventCategory,
  EventType,
  GameMode,
  GamePhase,
  GovernmentType,
  Ideology,
  MapSize,
  PrismaClient,
  ResearchMethod,
  RoomStatus,
  StartingWealth,
  TechCategory,
  TechStatus,
  TerrainType,
  UnitStatus,
  UnitType,
} from '@prisma/client'

const prisma = new PrismaClient()

const defaultResources = {
  food: 1000,
  wood: 800,
  ore: 600,
  energy: 400,
  rubber: 120,
  rareMetals: 90,
  oil: 300,
  uranium: 10,
  money: 5000,
  researchPoints: 250,
  manpower: 200000,
}

const defaultPolicies = {
  economicPolicy: 'MIXED',
  conscription: 'LIMITED',
  freedomLevel: 55,
  propaganda: true,
}

async function main() {
  await prisma.player.createMany({
    data: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'player_one',
        email: 'player1@example.com',
        passwordHash: 'hashed_password_1',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        username: 'player_two',
        email: 'player2@example.com',
        passwordHash: 'hashed_password_2',
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        username: 'player_three',
        email: 'player3@example.com',
        passwordHash: 'hashed_password_3',
      },
    ],
    skipDuplicates: true,
  })

  await prisma.achievement.createMany({
    data: [
      {
        id: 'ACH_CONQUEROR',
        name: 'Master Conqueror',
        nameZh: '征服大师',
        description: 'Win 10 games in any mode.',
        icon: '/icons/achievements/conqueror.png',
        rarity: AchievementRarity.RARE,
        condition: {
          type: 'WIN_GAMES',
          requirements: { games: 10 },
        },
      },
      {
        id: 'ACH_STRATEGIST',
        name: 'Brilliant Strategist',
        nameZh: '战略大师',
        description: 'Complete a game without losing a battle.',
        icon: '/icons/achievements/strategist.png',
        rarity: AchievementRarity.EPIC,
        condition: {
          type: 'NO_LOSSES',
          requirements: { battles: 0 },
        },
      },
    ],
    skipDuplicates: true,
  })

  await prisma.playerAchievement.createMany({
    data: [
      {
        playerId: '11111111-1111-1111-1111-111111111111',
        achievementId: 'ACH_CONQUEROR',
      },
    ],
    skipDuplicates: true,
  })

  await prisma.techDefinition.createMany({
    data: [
      {
        id: 'TECH_INFANTRY_1',
        name: 'Modern Infantry Tactics',
        nameZh: '现代步兵战术',
        description: 'Improves infantry combat efficiency.',
        category: TechCategory.MILITARY_INFANTRY,
        tier: 2,
        prerequisites: ['TECH_INFANTRY_0'],
        researchCost: 500,
        researchTime: 5,
        effects: {
          unitType: 'INFANTRY',
          strengthBonus: 10,
        },
      },
      {
        id: 'TECH_ENERGY_1',
        name: 'Advanced Energy Production',
        nameZh: '先进能源生产',
        description: 'Boosts overall energy generation.',
        category: TechCategory.INDUSTRIAL,
        tier: 3,
        prerequisites: ['TECH_ENERGY_0'],
        researchCost: 600,
        researchTime: 6,
        effects: {
          resourceType: 'ENERGY',
          productionBonus: 15,
        },
      },
    ],
    skipDuplicates: true,
  })

  const gameRoom = await prisma.gameRoom.upsert({
    where: { roomCode: 'ABC123' },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Demo Room',
      roomCode: 'ABC123',
      hostId: '11111111-1111-1111-1111-111111111111',
      minPlayers: 3,
      maxPlayers: 6,
      gameMode: GameMode.STANDARD,
      mapSize: MapSize.MEDIUM,
      status: RoomStatus.WAITING,
      victoryThreshold: 0.75,
      gameSpeed: 1.0,
    },
  })

  await prisma.gameRoomPlayer.createMany({
    data: [
      {
        gameRoomId: gameRoom.id,
        playerId: '11111111-1111-1111-1111-111111111111',
        isReady: true,
      },
      {
        gameRoomId: gameRoom.id,
        playerId: '22222222-2222-2222-2222-222222222222',
        isReady: false,
      },
    ],
    skipDuplicates: true,
  })

  await prisma.nation.upsert({
    where: { id: '55555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Aurora Dominion',
      flagColor: '#FFCC00',
      ideology: Ideology.LIBERAL_DEMOCRACY,
      governmentType: GovernmentType.DEMOCRACY,
      startingWealth: StartingWealth.MODERATE,
      startingTech: 3,
      startingPopulation: BigInt(8000000),
      startingTerritory: 5,
      resources: defaultResources,
      stability: 75,
      cohesion: 70,
      population: BigInt(8200000),
      policies: defaultPolicies,
      gameRoomId: gameRoom.id,
      playerId: '11111111-1111-1111-1111-111111111111',
    },
  })

  await prisma.territory.createMany({
    data: [
      {
        id: '66666666-6666-6666-6666-666666666666',
        name: 'Aurora Prime',
        type: TerrainType.PLAINS,
        x: 12,
        y: 18,
        size: 150,
        resourceProduction: defaultResources,
        hasPort: true,
        isCapital: true,
        infrastructureLevel: 4,
        nationId: '55555555-5555-5555-5555-555555555555',
        gameRoomId: gameRoom.id,
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        name: 'Northern Ridge',
        type: TerrainType.MOUNTAINS,
        x: 20,
        y: 25,
        size: 90,
        resourceProduction: {
          ...defaultResources,
          energy: 600,
          rareMetals: 180,
        },
        hasPort: false,
        isCapital: false,
        infrastructureLevel: 2,
        nationId: '55555555-5555-5555-5555-555555555555',
        gameRoomId: gameRoom.id,
      },
    ],
    skipDuplicates: true,
  })

  await prisma.nation.update({
    where: { id: '55555555-5555-5555-5555-555555555555' },
    data: { capitalId: '66666666-6666-6666-6666-666666666666' },
  })

  await prisma.building.createMany({
    data: [
      {
        id: '88888888-8888-8888-8888-888888888888',
        territoryId: '66666666-6666-6666-6666-666666666666',
        nationId: '55555555-5555-5555-5555-555555555555',
        type: BuildingType.RESEARCH_LAB,
        level: 2,
        constructionProgress: 100,
        isActive: true,
      },
      {
        id: '99999999-9999-9999-9999-999999999999',
        territoryId: '77777777-7777-7777-7777-777777777777',
        nationId: '55555555-5555-5555-5555-555555555555',
        type: BuildingType.MILITARY_BASE,
        level: 1,
        constructionProgress: 50,
        isActive: false,
      },
    ],
    skipDuplicates: true,
  })

  await prisma.general.upsert({
    where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    update: {},
    create: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      nationId: '55555555-5555-5555-5555-555555555555',
      name: 'General Solaris',
      attack: 7,
      defense: 6,
      planning: 8,
      logistics: 5,
      traits: ['TACTICIAN', 'CHARISMATIC'],
    },
  })

  await prisma.militaryUnit.createMany({
    data: [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        nationId: '55555555-5555-5555-5555-555555555555',
        territoryId: '66666666-6666-6666-6666-666666666666',
        type: UnitType.INFANTRY,
        name: '1st Aurora Guard',
        quantity: 12000,
        experience: 10,
        morale: 85,
        strength: 90,
        status: UnitStatus.IDLE,
        movement: 5,
        generalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        supply: 95,
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        nationId: '55555555-5555-5555-5555-555555555555',
        territoryId: '77777777-7777-7777-7777-777777777777',
        type: UnitType.LIGHT_TANK,
        name: 'Aurora Armored Division',
        quantity: 400,
        experience: 6,
        morale: 80,
        strength: 88,
        status: UnitStatus.MOVING,
        movement: 3,
        supply: 88,
      },
    ],
    skipDuplicates: true,
  })

  await prisma.techProgress.createMany({
    data: [
      {
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        nationId: '55555555-5555-5555-5555-555555555555',
        techId: 'TECH_INFANTRY_1',
        status: TechStatus.RESEARCHING,
        progress: 45,
        researchMethod: ResearchMethod.NORMAL,
      },
      {
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        nationId: '55555555-5555-5555-5555-555555555555',
        techId: 'TECH_ENERGY_1',
        status: TechStatus.AVAILABLE,
        progress: 0,
        researchMethod: ResearchMethod.NORMAL,
      },
    ],
    skipDuplicates: true,
  })

  await prisma.diplomaticRelation.createMany({
    data: [
      {
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        nationId: '55555555-5555-5555-5555-555555555555',
        targetNationId: '55555555-5555-5555-5555-555555555555',
        relationValue: 50,
        status: DiplomaticStatus.FRIENDLY,
        tradeAgreement: true,
        modifiers: [{ source: 'HISTORICAL_TIES', value: 10 }],
      },
    ],
    skipDuplicates: true,
  })

  await prisma.gameEvent.createMany({
    data: [
      {
        id: '1111aaaa-2222-bbbb-3333-cccc4444dddd',
        gameRoomId: gameRoom.id,
        type: EventType.MILESTONE,
        category: EventCategory.TECH_BREAKTHROUGH,
        title: 'Energy Breakthrough',
        description: 'Scientists have unlocked a new energy technology.',
        options: [
          {
            id: 'ACCEPT',
            label: 'Invest in energy infrastructure',
            consequences: { energy: '+20%', stability: '+5' },
          },
          {
            id: 'DECLINE',
            label: 'Maintain current strategy',
            consequences: { energy: '+0%', stability: '+0' },
          },
        ],
        chosenOption: 'ACCEPT',
        consequences: { energy: '+20%', researchPoints: '-50' },
        targetNationId: '55555555-5555-5555-5555-555555555555',
      },
    ],
    skipDuplicates: true,
  })

  await prisma.gameState.upsert({
    where: { gameRoomId: gameRoom.id },
    update: {
      stateData: {
        turn: 5,
        phase: 'ECONOMY',
        nations: ['55555555-5555-5555-5555-555555555555'],
      },
      turn: 5,
      phase: GamePhase.ECONOMY,
    },
    create: {
      id: '5555aaaa-6666-bbbb-7777-cccc8888dddd',
      gameRoomId: gameRoom.id,
      stateData: {
        turn: 5,
        phase: 'ECONOMY',
        nations: ['55555555-5555-5555-5555-555555555555'],
      },
      turn: 5,
      phase: GamePhase.ECONOMY,
    },
  })

  console.log('Seeding completed successfully!')
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { BALANCE } from './balance'

export function calculateEconomicGrowth(currentGDP: number): number {
  return currentGDP * BALANCE.economy.maxGrowth
}

export function calculateMilitaryUpkeep(totalUnits: number): number {
  return totalUnits * BALANCE.military.infantryCost * 0.1
}

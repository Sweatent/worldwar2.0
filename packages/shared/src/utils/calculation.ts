export interface CombatPowerInput {
  infantry: number
  tanks: number
  aircraft: number
}

export function calculateCombatPower(input: CombatPowerInput): number {
  const infantryPower = input.infantry * 1
  const tankPower = input.tanks * 5
  const aircraftPower = input.aircraft * 8

  return infantryPower + tankPower + aircraftPower
}

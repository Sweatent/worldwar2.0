export type GovernmentType = 'democracy' | 'monarchy' | 'dictatorship'

export interface Nation {
  id: string
  name: string
  population: number
  government: GovernmentType
  gdp: number
}

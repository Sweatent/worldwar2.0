export interface Player {
  id: string
  username: string
  email: string
}

export interface PlayerStats {
  gamesPlayed: number
  gamesWon: number
  winRate: number
}

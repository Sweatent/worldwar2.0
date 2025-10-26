import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { Battle } from '../../types/game'

interface MultipleBattlesManagerProps {
  onBattleSelected?: (battle: Battle) => void
  className?: string
}

export function MultipleBattlesManager({
  onBattleSelected,
  className,
}: MultipleBattlesManagerProps) {
  const { gameState } = useGameStore((state) => state)

  const activeBattles = useMemo(
    () => gameState?.battles.filter((battle) => battle.status === 'ACTIVE') ?? [],
    [gameState?.battles]
  )

  if (activeBattles.length === 0) {
    return null
  }

  return (
    <div className={`fixed bottom-20 left-4 space-y-2 ${className ?? ''}`}>
      <AnimatePresence>
        {activeBattles.map((battle) => (
          <motion.div
            key={battle.id}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onBattleSelected?.(battle)}
            className="cursor-pointer rounded-lg bg-red-900/90 p-3 text-white shadow-lg shadow-red-900/25 transition hover:bg-red-800"
          >
            <div className="flex items-center gap-2">
              <div className="text-2xl animate-pulse drop-shadow">⚔️</div>
              <div className="leading-tight">
                <div className="text-sm font-bold">
                  {battle.territory.name} 战役
                </div>
                <div className="text-xs text-red-200">
                  {battle.attacker.name} vs {battle.defender.name}
                </div>
                <div className="mt-1 text-xs text-red-300">
                  回合 {battle.currentRound}/{battle.maxRounds}
                </div>
              </div>
            </div>

            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-600"
                style={{ width: `${(battle.currentRound / battle.maxRounds) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'
import { GAME_MODES } from '../../../shared/src/constants/game-modes'

type Props = {
  onSelect: (mode: any) => void
}

export function GameModeSelector({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.values(GAME_MODES).map(mode => (
        <motion.div
          key={mode.id}
          whileHover={{ scale: 1.05 }}
          className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700"
          onClick={() => onSelect(mode)}
        >
          <h3 className="text-xl font-bold text-white mb-2">{mode.name}</h3>
          <div className="text-sm text-gray-400 mb-4">{mode.description}</div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">预计时长：</span>
              <span className="text-white">{mode.duration} 分钟</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">回合时长：</span>
              <span className="text-white">{mode.turnDuration} 秒</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">地图大小：</span>
              <span className="text-white">{mode.mapSize}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

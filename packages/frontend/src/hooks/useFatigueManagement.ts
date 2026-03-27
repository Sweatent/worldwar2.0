import { useEffect, useState } from 'react'

// Placeholder notification implementation; your app can wire this to a UI library
function showNotification({ title, message, type }: { title: string; message: string; type: 'info' | 'warning' | 'success' | 'error' }) {
  // eslint-disable-next-line no-console
  console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
}

export function useFatigueManagement() {
  const [playTime, setPlayTime] = useState(0)
  const [showFatigueNotice, setShowFatigueNotice] = useState(false)

  useEffect(() => {
    // 每分钟更新一次
    const interval = setInterval(() => {
      setPlayTime(prev => {
        const newTime = prev + 1

        // 1小时后提示
        if (newTime === 60) {
          setShowFatigueNotice(true)
          showNotification({
            title: '适度游戏提醒',
            message: '您已经玩了1小时，建议适当休息哦~',
            type: 'info',
          })
        }

        // 2小时后再次提示（心理学机制：反向心理激发继续游戏欲望）
        if (newTime === 120) {
          showNotification({
            title: '再坚持一下！',
            message: '您的国家正处于关键时刻，人民需要您的领导！',
            type: 'warning',
          })
        }

        return newTime
      })
    }, 60000) // 每分钟

    return () => clearInterval(interval)
  }, [])

  return { playTime, showFatigueNotice }
}

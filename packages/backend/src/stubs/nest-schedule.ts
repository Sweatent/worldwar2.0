export function Cron(_expression: string) {
  return function () {
    return undefined
  }
}

export const CronExpression = {
  EVERY_MINUTE: '* * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
}

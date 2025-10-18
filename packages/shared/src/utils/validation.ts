export function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 20
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

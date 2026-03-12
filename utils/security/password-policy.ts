export const MIN_PASSWORD_LENGTH = 12

export function validateNewPassword(password: string, confirmPassword?: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'Passwords do not match.'
  }

  return null
}

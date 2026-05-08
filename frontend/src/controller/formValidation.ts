import { t } from '@/i18n'

export function validateUsername(username: string, required = true): string | undefined {
  if (required && username === '') {
    return t('validation.username.required')
  }
  if (username.length < 3) {
    return t('validation.username.minLength')
  }
  if (username.includes(' ')) {
    return t('validation.username.noSpaces')
  }
  // TODO: check if username includes bad words
  return undefined
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    return t('validation.password.minLength')
  }
  return undefined
}

export function validateEmail(email: string, required = true): string | undefined {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (required && email === '') {
    return t('validation.email.required')
  }
  if (emailRegex.exec(email) === null) {
    return t('validation.email.invalid')
  }
  return undefined
}

export function validateUsername(username: string, required = true): string | undefined {
  if (required && username === '') {
    return 'Username is Required'
  }
  if (username.length < 3) {
    return 'Username must be at least 3 characters long'
  }
  if (username.includes(' ')) {
    return 'Username cannot contain spaces'
  }
  // TODO: check if username includes bad words
  return undefined
}

export function validatePassword(password: string) {
  if (password.length < 8) {
    return 'Password needs to be at least 8 characters long'
  }
  return undefined
}

export function validateEmail(email: string, required = true): string | undefined {
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  if (required && email === '') {
    return 'Email is required'
  }
  if (emailRegex.exec(email) === null) {
    return 'Invalid Email'
  }
  return undefined
}

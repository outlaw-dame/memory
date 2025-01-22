import { t } from 'elysia'
import { _selectUsers } from './db'

export const loginResponse = t.Object({
  token: t.String(),
  user: _selectUsers
})

export * from './user'
import { Profanity } from '@2toad/profanity'
import { List } from '@2toad/profanity/dist/models'
import { list } from 'the-big-username-blacklist'

export function getProfanity() {
  const whiteList = new List(() => true)
  whiteList.addWords(['taiwan'])
  const profanity = new Profanity({
    languages: ['en', 'de', 'fr', 'ja', 'pt', 'es', 'ru', 'ar', 'ko'],
    wholeWord: true
  })
  profanity.addWords(list)
  profanity.whitelist = whiteList

  return profanity
}

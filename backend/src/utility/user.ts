import { Profanity } from '@2toad/profanity';
import { List } from '@2toad/profanity/dist/models';
import { list } from 'the-big-username-blacklist';
import { User } from '../types';
import molecularWeb from 'moleculer-web';
import CONFIG from '../../config/config.js';
import jwt from 'jsonwebtoken';

export function checkProfanity(username: string): boolean {
  const whiteList = new List(() => true);
  const profanity = new Profanity({
    languages: ['en', 'de', 'fr', 'ja', 'pt', 'es', 'ru', 'ar', 'ko'],
    wholeWord: true
  });
  profanity.addWords(list);
  profanity.whitelist = whiteList;
  return profanity.exists(username);
}

/**
 * Generate a JWT From an user object
 * @param {User} user - User object of the user that should be turned into a jwt
 * @returns {string} - Returns the jwt
 */
export function generateJWT(user: User): string {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + CONFIG.JWT_EXPIRATION_TIME // How long the token should be valid in seconds
  };

  return jwt.sign(payload, CONFIG.JWT_SECRET as string, {
    algorithm: 'HS256'
  });
}

/**
 * Decodes a jwt if it is not verifyable throw an unauthorized error
 * @param {string} token - token that should be decoded
 * @returns {User} the decoded object
 */
export function verifyJWT(token: string): User {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET as string, {
      algorithms: ['HS256']
    });
    return decoded as User;
  } catch (err) {
    throw new molecularWeb.Errors.UnAuthorizedError('Invalid token', {});
  }
}

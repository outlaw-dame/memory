// import { t, type Static } from 'elysia'
import { Type, Static } from '@sinclair/typebox';
import { viablePodProviders } from './enums';

// Auth
// SignIn
export const signinBody = Type.Object({
  username: Type.String(),
  password: Type.String()
});
export type SignInBody = Static<typeof signinBody>;

export const user = Type.Object({
  username: Type.String(),
  uuid: Type.String(),
  webId: Type.String()
});
export type User = Static<typeof user>;

export const signinResponse = Type.Object({
  token: Type.String(),
  user: user
});
export type SignInResponse = Static<typeof signinResponse>;

export const signUpBody = Type.Object({
  username: Type.String(),
  password: Type.String()
  /* providerName: viablePodProviders */
});
export type SignUpBody = Static<typeof signUpBody>;

// Posts
export type SelectPost = {
  id: number;
  content: string;
  isPublic: boolean;
  createdAt: string;
  authorId: number;
  author: {
    id: number;
    name: string;
    webId: string;
  };
};

export interface BaseResponse {
  '@context': {
    '@vocab': string;
  };
  '@id': string;
  '@type': string;
}

// Create
export interface AuthAccountCreateBody {
  uuid: string;
  username: string;
  password: string;
  webId: string;
}

// Verify
export interface AuthAccountVerifyBody {
  username: string;
  password: string;
}

export interface AuthAccountVerifyResponse extends BaseResponse {
  hashedPassword: string;
  username: string;
  uuid: string;
  webId: string;
}

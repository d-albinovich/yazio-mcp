export const YAZIO_USERNAME_ENV = 'YAZIO_USERNAME';
export const YAZIO_PASSWORD_ENV = 'YAZIO_PASSWORD';
export const YAZIO_MOBILE_CLIENT_ID_ENV = 'YAZIO_MOBILE_CLIENT_ID';
export const YAZIO_MOBILE_CLIENT_SECRET_ENV = 'YAZIO_MOBILE_CLIENT_SECRET';

export interface YazioCredentials {
  username: string;
  password: string;
}

export interface YazioV20Credentials extends YazioCredentials {
  mobileClientId: string;
  mobileClientSecret: string;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

export function loadYazioCredentials(): YazioCredentials {
  return {
    username: getRequiredEnv(YAZIO_USERNAME_ENV),
    password: getRequiredEnv(YAZIO_PASSWORD_ENV),
  };
}

export function loadYazioV20Credentials(): YazioV20Credentials {
  return {
    ...loadYazioCredentials(),
    mobileClientId: getRequiredEnv(YAZIO_MOBILE_CLIENT_ID_ENV),
    mobileClientSecret: getRequiredEnv(YAZIO_MOBILE_CLIENT_SECRET_ENV),
  };
}

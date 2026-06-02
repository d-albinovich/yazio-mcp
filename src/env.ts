export const YAZIO_USERNAME_ENV = 'YAZIO_USERNAME';
export const YAZIO_PASSWORD_ENV = 'YAZIO_PASSWORD';
export const YAZIO_MOBILE_CLIENT_ID_ENV = 'YAZIO_MOBILE_CLIENT_ID';
export const YAZIO_MOBILE_CLIENT_SECRET_ENV = 'YAZIO_MOBILE_CLIENT_SECRET';

// Public OAuth client credentials baked into the Yazio mobile app (prod). They are
// not secrets — the same values ship in the app and the `yazio` npm package — so we
// default to them and only require the user's own username/password. Either can still
// be overridden via the env vars above.
const DEFAULT_MOBILE_CLIENT_ID = '1_4hiybetvfksgw40o0sog4s884kwc840wwso8go4k8c04goo4c';
const DEFAULT_MOBILE_CLIENT_SECRET = '6rok2m65xuskgkgogw40wkkk8sw0osg84s8cggsc4woos4s8o';

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

export function loadYazioV20Credentials(): YazioV20Credentials {
  return {
    username: getRequiredEnv(YAZIO_USERNAME_ENV),
    password: getRequiredEnv(YAZIO_PASSWORD_ENV),
    mobileClientId: process.env[YAZIO_MOBILE_CLIENT_ID_ENV] ?? DEFAULT_MOBILE_CLIENT_ID,
    mobileClientSecret:
      process.env[YAZIO_MOBILE_CLIENT_SECRET_ENV] ?? DEFAULT_MOBILE_CLIENT_SECRET,
  };
}

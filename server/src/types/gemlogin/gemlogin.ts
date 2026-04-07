export interface BrowserVersion {
  id: string;
  name: string;
  version: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
  browserVersion?: string;
  proxy?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  fingerprint?: string;
  timezone?: string;
  [key: string]: unknown;
}

export interface CreateProfilePayload {
  name: string;
  browserVersion?: string;
  proxy?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
  fingerprint?: string;
  timezone?: string;
}

export interface StartProfileResult {
  wsUrl: string;
  cdpUrl: string;
  profileId: string;
}

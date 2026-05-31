#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENV_PATH = process.env.YAZIO_ENV_PATH ?? join(homedir(), '.hermes', '.env');
const V20_BASE_URL = 'https://yzapi.yazio.com/v20';
const REQUIRED_ENV_KEYS = [
  'YAZIO_USERNAME',
  'YAZIO_PASSWORD',
  'YAZIO_MOBILE_CLIENT_ID',
  'YAZIO_MOBILE_CLIENT_SECRET',
];

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

async function loadConfig() {
  const env = {};

  for (const key of REQUIRED_ENV_KEYS) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }

  if (REQUIRED_ENV_KEYS.every((key) => env[key])) {
    return env;
  }

  const envContent = await readFile(ENV_PATH, 'utf8');

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!REQUIRED_ENV_KEYS.includes(key) || env[key]) {
      continue;
    }

    env[key] = parseEnvValue(trimmed.slice(separatorIndex + 1));
  }

  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  return env;
}

function sanitizeText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/access_token"\s*:\s*"[^"]+"/gi, 'access_token":"[redacted]"')
    .replace(/refresh_token"\s*:\s*"[^"]+"/gi, 'refresh_token":"[redacted]"')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildValidPayload() {
  return {
    id: randomUUID(),
    name: `Hermes Probe Product ${new Date().toISOString()}`,
    category: 'miscellaneous',
    base_unit: 'g',
    is_private: true,
    nutrients: {
      'energy.energy': 250,
      'nutrient.fat': 5,
      'nutrient.protein': 10,
      'nutrient.carb': 30,
    },
    servings: [
      {
        serving: 'portion',
        amount: 100,
      },
    ],
    producer: 'Hermes Probe',
    country: 'DE',
  };
}

function buildInvalidPayload() {
  return {
    ...buildValidPayload(),
    category: 'invalid-category',
  };
}

async function main() {
  const config = await loadConfig();

  const tokenResponse = await fetch(`${V20_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.YAZIO_MOBILE_CLIENT_ID,
      client_secret: config.YAZIO_MOBILE_CLIENT_SECRET,
      username: config.YAZIO_USERNAME,
      password: config.YAZIO_PASSWORD,
      grant_type: 'password',
    }),
  });

  let accessToken = '';
  if (tokenResponse.ok) {
    const tokenJson = await tokenResponse.json();
    accessToken = typeof tokenJson.access_token === 'string' ? tokenJson.access_token : '';
  }

  console.log('token_status', tokenResponse.status, 'has_access_token', Boolean(accessToken));

  if (!tokenResponse.ok || !accessToken) {
    return;
  }

  const shouldCreateValidProduct = process.env.YAZIO_CREATE_PRODUCT_CONFIRM === '1';
  const payload = shouldCreateValidProduct ? buildValidPayload() : buildInvalidPayload();

  const createResponse = await fetch(`${V20_BASE_URL}/user/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const createText = await createResponse.text();
  console.log('create_status', createResponse.status);

  if (shouldCreateValidProduct) {
    console.log('create_response', sanitizeText(createText));
    return;
  }

  console.log('create_error', sanitizeText(createText));
}

main().catch((error) => {
  console.error('probe_failed', sanitizeText(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});

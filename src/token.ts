// src/token.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_DIR, getAccount } from "./config.js";
import type { TokenStore } from "./types.js";

const TOKEN_PATH = join(CONFIG_DIR, "tokens.json");
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes before expiry

function loadTokenStore(): TokenStore {
  if (!existsSync(TOKEN_PATH)) return {};
  const raw = readFileSync(TOKEN_PATH, "utf-8");
  return JSON.parse(raw) as TokenStore;
}

function saveTokenStore(store: TokenStore): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(TOKEN_PATH, JSON.stringify(store, null, 2), { encoding: "utf-8", mode: 0o600 });
}

async function fetchToken(appId: string, appSecret: string): Promise<{ accessToken: string; expiresIn: number }> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json() as any;
  if (data.errcode) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getAccessToken(accountAlias: string): Promise<string> {
  const store = loadTokenStore();
  const cached = store[accountAlias];

  if (cached && cached.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return cached.accessToken;
  }

  const { config } = getAccount(accountAlias);
  const { accessToken, expiresIn } = await fetchToken(config.appId, config.appSecret);

  store[accountAlias] = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  saveTokenStore(store);

  return accessToken;
}

export async function clearToken(accountAlias: string): Promise<void> {
  const store = loadTokenStore();
  delete store[accountAlias];
  saveTokenStore(store);
}

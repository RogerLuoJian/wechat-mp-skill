// src/config.ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Config, AccountConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".wechat-mp");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `Config file not found: ${CONFIG_PATH}\nCopy config.example.json to ${CONFIG_PATH} and fill in your account details.`
    );
  }
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw) as Config;
  if (!config.accounts || Object.keys(config.accounts).length === 0) {
    throw new Error(
      `Invalid config: "accounts" must be a non-empty object in ${CONFIG_PATH}`
    );
  }
  for (const [alias, account] of Object.entries(config.accounts)) {
    if (!account.appId || !account.appSecret) {
      throw new Error(
        `Invalid config: account "${alias}" missing appId or appSecret`
      );
    }
  }
  return config;
}

interface AccountResult {
  alias: string;
  config: AccountConfig;
  all?: { alias: string; name: string }[];
}

export function getAccount(alias?: string): AccountResult {
  const config = loadConfig();
  if (alias) {
    const account = config.accounts[alias];
    if (!account) {
      const available = Object.keys(config.accounts).join(", ");
      throw new Error(
        `Account "${alias}" not found. Available accounts: ${available}`
      );
    }
    return { alias, config: account };
  }
  const all = Object.entries(config.accounts).map(([a, c]) => ({
    alias: a,
    name: c.name,
  }));
  return { alias: "", config: config.accounts[all[0].alias], all };
}

export { CONFIG_DIR };

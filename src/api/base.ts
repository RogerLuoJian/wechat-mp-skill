// src/api/base.ts

const DEFAULT_BASE_URL = "https://api.weixin.qq.com";
const BASE_URL_ENV_KEYS = [
  "WECHAT_MP_API_BASE_URL",
  "WECHAT_API_BASE_URL",
  "WEIXIN_API_BASE_URL",
];

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getWechatApiBaseUrl(): string {
  for (const key of BASE_URL_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return normalizeBaseUrl(value);
    }
  }
  return DEFAULT_BASE_URL;
}


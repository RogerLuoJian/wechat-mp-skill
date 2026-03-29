// src/api/client.ts
import { getAccessToken, clearToken } from "../token.js";

const BASE_URL = "https://api.weixin.qq.com";
const TOKEN_EXPIRED_CODES = new Set([40001, 42001]);

async function request(
  accountAlias: string,
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<any> {
  const token = await getAccessToken(accountAlias);
  const separator = path.includes("?") ? "&" : "?";
  const url = `${BASE_URL}${path}${separator}access_token=${token}`;

  const res = await fetch(url, options);
  const data = await res.json() as any;

  if (data.errcode && TOKEN_EXPIRED_CODES.has(data.errcode) && !isRetry) {
    await clearToken(accountAlias);
    return request(accountAlias, path, options, true);
  }

  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeChat API error ${data.errcode}: ${data.errmsg}`);
  }

  return data;
}

export async function wechatGet(accountAlias: string, path: string): Promise<any> {
  return request(accountAlias, path, { method: "GET" });
}

export async function wechatPost(accountAlias: string, path: string, body: any): Promise<any> {
  return request(accountAlias, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function wechatUpload(
  accountAlias: string,
  path: string,
  formData: FormData
): Promise<any> {
  return request(accountAlias, path, {
    method: "POST",
    body: formData,
  });
}

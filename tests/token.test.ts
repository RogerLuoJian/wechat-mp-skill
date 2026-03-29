// tests/token.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { getAccessToken } from "../src/token.js";

vi.mock("node:fs");
vi.mock("../src/config.js", () => ({
  CONFIG_DIR: "/mock/.wechat-mp",
  getAccount: (alias: string) => ({
    alias,
    config: { name: "Test", appId: "wx_test", appSecret: "secret_test" },
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("getAccessToken", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdirSync).mockReturnValue(undefined as any);
    vi.mocked(writeFileSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches new token when no cache exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "new_token", expires_in: 7200 }),
    });

    const token = await getAccessToken("my-blog");
    expect(token).toBe("new_token");
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("returns cached token when not expired", async () => {
    const cache = {
      "my-blog": {
        accessToken: "cached_token",
        expiresAt: Date.now() + 3600 * 1000,
      },
    };
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(cache));

    const token = await getAccessToken("my-blog");
    expect(token).toBe("cached_token");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refreshes token when expired", async () => {
    const cache = {
      "my-blog": {
        accessToken: "old_token",
        expiresAt: Date.now() - 1000,
      },
    };
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(cache));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "refreshed_token", expires_in: 7200 }),
    });

    const token = await getAccessToken("my-blog");
    expect(token).toBe("refreshed_token");
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errcode: 40013, errmsg: "invalid appid" }),
    });

    await expect(getAccessToken("my-blog")).rejects.toThrow("invalid appid");
  });
});

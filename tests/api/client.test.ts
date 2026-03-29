// tests/api/client.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../src/token.js", () => ({
  getAccessToken: vi.fn().mockResolvedValue("test_token"),
  clearToken: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { wechatGet, wechatPost, wechatUpload } from "../../src/api/client.js";
import { getAccessToken, clearToken } from "../../src/token.js";

describe("wechatGet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects access_token and returns data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total_count: 5 }),
    });

    const data = await wechatGet("my-blog", "/cgi-bin/draft/batchget");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("access_token=test_token"),
      expect.any(Object)
    );
    expect(data.total_count).toBe(5);
  });

  it("retries once on token expiry error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errcode: 42001, errmsg: "access_token expired" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_count: 3 }),
      });

    vi.mocked(getAccessToken).mockResolvedValueOnce("new_token");

    const data = await wechatGet("my-blog", "/cgi-bin/draft/batchget");
    expect(clearToken).toHaveBeenCalledWith("my-blog");
    expect(data.total_count).toBe(3);
  });

  it("throws on non-token API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errcode: 45009, errmsg: "reach max api daily quota limit" }),
    });

    await expect(wechatGet("my-blog", "/cgi-bin/draft/batchget")).rejects.toThrow(
      "reach max api daily quota limit"
    );
  });
});

describe("wechatPost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends JSON body with access_token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ media_id: "draft_123" }),
    });

    const data = await wechatPost("my-blog", "/cgi-bin/draft/add", { articles: [] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("access_token=test_token"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ articles: [] }),
      })
    );
    expect(data.media_id).toBe("draft_123");
  });
});

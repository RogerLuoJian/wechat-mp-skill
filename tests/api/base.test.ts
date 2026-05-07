import { describe, it, expect, afterEach, vi } from "vitest";
import { getWechatApiBaseUrl } from "../../src/api/base.js";

describe("getWechatApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the official WeChat API", () => {
    expect(getWechatApiBaseUrl()).toBe("https://api.weixin.qq.com");
  });

  it("uses the first configured gateway environment variable", () => {
    vi.stubEnv("WECHAT_API_BASE_URL", "https://fallback.example.com/");
    vi.stubEnv("WECHAT_MP_API_BASE_URL", "https://primary.example.com/wechat/");

    expect(getWechatApiBaseUrl()).toBe("https://primary.example.com/wechat");
  });

  it("supports WEIXIN_API_BASE_URL as a compatibility fallback", () => {
    vi.stubEnv("WEIXIN_API_BASE_URL", "https://weixin.example.com/");

    expect(getWechatApiBaseUrl()).toBe("https://weixin.example.com");
  });
});


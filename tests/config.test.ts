// tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { loadConfig, getAccount } from "../src/config.js";

vi.mock("node:fs");

const mockConfig = {
  accounts: {
    "my-blog": {
      name: "我的博客",
      appId: "wx_test_1",
      appSecret: "secret_1",
    },
    "tech-weekly": {
      name: "技术周刊",
      appId: "wx_test_2",
      appSecret: "secret_2",
    },
  },
};

describe("loadConfig", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and parses config file", () => {
    const config = loadConfig();
    expect(config.accounts["my-blog"].appId).toBe("wx_test_1");
    expect(config.accounts["tech-weekly"].name).toBe("技术周刊");
  });

  it("throws if config file does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    expect(() => loadConfig()).toThrow("Config file not found");
  });

  it("throws if config is missing accounts", () => {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));
    expect(() => loadConfig()).toThrow("accounts");
  });
});

describe("getAccount", () => {
  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockConfig));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns account by alias", () => {
    const account = getAccount("my-blog");
    expect(account.config.appId).toBe("wx_test_1");
    expect(account.alias).toBe("my-blog");
  });

  it("throws if alias not found", () => {
    expect(() => getAccount("nonexistent")).toThrow("not found");
  });

  it("returns all accounts when no alias given", () => {
    const result = getAccount();
    expect(result.all).toHaveLength(2);
    expect(result.all![0].alias).toBe("my-blog");
  });
});

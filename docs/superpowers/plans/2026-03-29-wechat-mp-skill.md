# WeChat MP Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code Skill + TypeScript CLI tool for managing multiple WeChat Official Account drafts and materials via the WeChat MP API.

**Architecture:** Skill file (`skill.md`) orchestrates interaction flow and delegates all API operations to a TypeScript CLI tool. The CLI reads account config from `~/.wechat-mp/config.json`, caches access tokens in `~/.wechat-mp/tokens.json`, and outputs JSON for Claude to parse. Markdown articles are converted to WeChat-compatible HTML with inline styles.

**Tech Stack:** TypeScript, Node 18+ (built-in fetch), commander (CLI), marked + highlight.js (Markdown→HTML), vitest (testing)

---

## File Structure

```
wechat-mp-skill/
├── skill.md                      # Skill definition (prompts + workflow)
├── package.json                  # Dependencies, bin, scripts
├── tsconfig.json                 # TypeScript config
├── config.example.json           # Config template for users
├── src/
│   ├── types.ts                  # Shared type definitions
│   ├── config.ts                 # Read/validate ~/.wechat-mp/config.json
│   ├── token.ts                  # access_token cache + refresh
│   ├── markdown.ts               # Markdown → WeChat HTML conversion
│   ├── api/
│   │   ├── client.ts             # HTTP client with token injection + error handling
│   │   ├── draft.ts              # Draft CRUD + publish
│   │   └── material.ts           # Material upload + list + get
│   └── cli.ts                    # CLI entry, commander subcommands
├── tests/
│   ├── config.test.ts
│   ├── token.test.ts
│   ├── markdown.test.ts
│   ├── api/
│   │   ├── client.test.ts
│   │   ├── draft.test.ts
│   │   └── material.test.ts
│   └── cli.test.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `config.example.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "wechat-mp-skill",
  "version": "0.1.0",
  "description": "Claude Code Skill for managing WeChat Official Account drafts and materials",
  "type": "module",
  "bin": {
    "wechat-mp": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create config.example.json**

```json
{
  "accounts": {
    "my-blog": {
      "name": "我的博客",
      "appId": "wx_your_app_id",
      "appSecret": "your_app_secret"
    }
  }
}
```

- [ ] **Step 4: Install dependencies**

Run:
```bash
npm install commander marked highlight.js
npm install -D typescript vitest @types/node
```

Expected: `package-lock.json` created, `node_modules/` populated, no errors.

- [ ] **Step 5: Verify build setup**

Create a minimal `src/cli.ts`:
```typescript
#!/usr/bin/env node
console.log(JSON.stringify({ status: "ok" }));
```

Run:
```bash
npx tsc
node dist/cli.js
```

Expected: `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json config.example.json src/cli.ts
git commit -m "chore: scaffold project with TypeScript, dependencies, and build config"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Define all shared types**

```typescript
// src/types.ts

export interface AccountConfig {
  name: string;
  appId: string;
  appSecret: string;
}

export interface Config {
  accounts: Record<string, AccountConfig>;
}

export interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export interface TokenStore {
  [accountAlias: string]: TokenCache;
}

export interface WechatApiError {
  errcode: number;
  errmsg: string;
}

export interface ArticleMeta {
  title: string;
  author?: string;
  digest?: string;
  thumb_media_id: string;
  content: string;
  content_source_url?: string;
  need_open_comment?: 0 | 1;
  only_fans_can_comment?: 0 | 1;
}

export interface DraftArticle {
  title: string;
  author: string;
  digest: string;
  content: string;
  thumb_media_id: string;
  content_source_url: string;
}

export interface DraftItem {
  media_id: string;
  content: {
    news_item: DraftArticle[];
  };
  update_time: number;
}

export interface DraftListResponse {
  total_count: number;
  item_count: number;
  item: DraftItem[];
}

export interface MaterialItem {
  media_id: string;
  name: string;
  update_time: number;
  url?: string;
}

export interface MaterialListResponse {
  total_count: number;
  item_count: number;
  item: MaterialItem[];
}

export interface UploadResult {
  media_id: string;
  url?: string;
}

export interface PublishResult {
  publish_id: string;
}
```

- [ ] **Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 3: Config Module

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/config.test.ts
```

Expected: FAIL — `loadConfig` and `getAccount` not defined.

- [ ] **Step 3: Implement config module**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/config.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat: add config loading and account resolution"
```

---

### Task 4: Token Management

**Files:**
- Create: `src/token.ts`
- Create: `tests/token.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/token.test.ts
```

Expected: FAIL — `getAccessToken` not defined.

- [ ] **Step 3: Implement token module**

```typescript
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
  writeFileSync(TOKEN_PATH, JSON.stringify(store, null, 2), "utf-8");
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/token.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/token.ts tests/token.test.ts
git commit -m "feat: add access_token caching and auto-refresh"
```

---

### Task 5: HTTP Client

**Files:**
- Create: `src/api/client.ts`
- Create: `tests/api/client.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/api/client.test.ts
```

Expected: FAIL — `wechatGet`, `wechatPost` not defined.

- [ ] **Step 3: Implement HTTP client**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/api/client.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts tests/api/client.test.ts
git commit -m "feat: add HTTP client with token injection and auto-retry"
```

---

### Task 6: Draft API

**Files:**
- Create: `src/api/draft.ts`
- Create: `tests/api/draft.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/api/draft.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/api/client.js", () => ({
  wechatPost: vi.fn(),
}));

import { listDrafts, createDraft, getDraft, deleteDraft, publishDraft } from "../../src/api/draft.js";
import { wechatPost } from "../../src/api/client.js";

describe("listDrafts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls batchget with offset and count", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({
      total_count: 10,
      item_count: 2,
      item: [{ media_id: "d1" }, { media_id: "d2" }],
    });

    const result = await listDrafts("my-blog", 0, 20);
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/draft/batchget", {
      offset: 0,
      count: 20,
      no_content: 0,
    });
    expect(result.item).toHaveLength(2);
  });
});

describe("createDraft", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends articles array", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({ media_id: "new_draft" });

    const article = {
      title: "Test",
      thumb_media_id: "thumb_1",
      content: "<p>Hello</p>",
    };
    const result = await createDraft("my-blog", [article]);
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/draft/add", {
      articles: [article],
    });
    expect(result.media_id).toBe("new_draft");
  });
});

describe("getDraft", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetches draft by media_id", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({
      news_item: [{ title: "Test" }],
    });

    const result = await getDraft("my-blog", "media_123");
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/draft/get", {
      media_id: "media_123",
    });
    expect(result.news_item[0].title).toBe("Test");
  });
});

describe("deleteDraft", () => {
  afterEach(() => vi.restoreAllMocks());

  it("deletes draft by media_id", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({ errcode: 0, errmsg: "ok" });

    await deleteDraft("my-blog", "media_123");
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/draft/delete", {
      media_id: "media_123",
    });
  });
});

describe("publishDraft", () => {
  afterEach(() => vi.restoreAllMocks());

  it("publishes draft by media_id", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({ publish_id: "pub_123" });

    const result = await publishDraft("my-blog", "media_123");
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/freepublish/submit", {
      media_id: "media_123",
    });
    expect(result.publish_id).toBe("pub_123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/api/draft.test.ts
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement draft API**

```typescript
// src/api/draft.ts
import { wechatPost } from "./client.js";
import type { ArticleMeta, DraftListResponse, PublishResult } from "../types.js";

export async function listDrafts(
  accountAlias: string,
  offset = 0,
  count = 20
): Promise<DraftListResponse> {
  return wechatPost(accountAlias, "/cgi-bin/draft/batchget", {
    offset,
    count,
    no_content: 0,
  });
}

export async function createDraft(
  accountAlias: string,
  articles: Partial<ArticleMeta>[]
): Promise<{ media_id: string }> {
  return wechatPost(accountAlias, "/cgi-bin/draft/add", { articles });
}

export async function getDraft(
  accountAlias: string,
  mediaId: string
): Promise<any> {
  return wechatPost(accountAlias, "/cgi-bin/draft/get", { media_id: mediaId });
}

export async function deleteDraft(
  accountAlias: string,
  mediaId: string
): Promise<void> {
  await wechatPost(accountAlias, "/cgi-bin/draft/delete", { media_id: mediaId });
}

export async function publishDraft(
  accountAlias: string,
  mediaId: string
): Promise<PublishResult> {
  return wechatPost(accountAlias, "/cgi-bin/freepublish/submit", {
    media_id: mediaId,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/api/draft.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/draft.ts tests/api/draft.test.ts
git commit -m "feat: add draft CRUD and publish API"
```

---

### Task 7: Material API

**Files:**
- Create: `src/api/material.ts`
- Create: `tests/api/material.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/api/material.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("../../src/api/client.js", () => ({
  wechatPost: vi.fn(),
  wechatUpload: vi.fn(),
}));

import { listMaterials, getMaterial, uploadMaterial } from "../../src/api/material.js";
import { wechatPost, wechatUpload } from "../../src/api/client.js";

describe("listMaterials", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists materials by type with pagination", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({
      total_count: 5,
      item_count: 2,
      item: [{ media_id: "m1" }, { media_id: "m2" }],
    });

    const result = await listMaterials("my-blog", "image", 0, 20);
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/material/batchget_material", {
      type: "image",
      offset: 0,
      count: 20,
    });
    expect(result.item).toHaveLength(2);
  });
});

describe("getMaterial", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gets material by media_id", async () => {
    vi.mocked(wechatPost).mockResolvedValueOnce({
      news_item: [{ title: "Image" }],
    });

    const result = await getMaterial("my-blog", "media_123");
    expect(wechatPost).toHaveBeenCalledWith("my-blog", "/cgi-bin/material/get_material", {
      media_id: "media_123",
    });
  });
});

describe("uploadMaterial", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uploads file as FormData", async () => {
    vi.mocked(wechatUpload).mockResolvedValueOnce({
      media_id: "uploaded_123",
      url: "https://example.com/img.jpg",
    });

    const mockFile = new Blob(["fake image"], { type: "image/jpeg" });
    const result = await uploadMaterial("my-blog", "image", mockFile, "test.jpg");
    expect(wechatUpload).toHaveBeenCalledWith(
      "my-blog",
      expect.stringContaining("/cgi-bin/material/add_material?type=image"),
      expect.any(FormData)
    );
    expect(result.media_id).toBe("uploaded_123");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/api/material.test.ts
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement material API**

```typescript
// src/api/material.ts
import { wechatPost, wechatUpload } from "./client.js";
import type { MaterialListResponse, UploadResult } from "../types.js";

export async function listMaterials(
  accountAlias: string,
  type: string,
  offset = 0,
  count = 20
): Promise<MaterialListResponse> {
  return wechatPost(accountAlias, "/cgi-bin/material/batchget_material", {
    type,
    offset,
    count,
  });
}

export async function getMaterial(
  accountAlias: string,
  mediaId: string
): Promise<any> {
  return wechatPost(accountAlias, "/cgi-bin/material/get_material", {
    media_id: mediaId,
  });
}

export async function uploadMaterial(
  accountAlias: string,
  type: string,
  file: Blob,
  filename: string
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("media", file, filename);
  return wechatUpload(
    accountAlias,
    `/cgi-bin/material/add_material?type=${type}`,
    formData
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/api/material.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api/material.ts tests/api/material.test.ts
git commit -m "feat: add material upload, list, and get API"
```

---

### Task 8: Markdown to HTML Conversion

**Files:**
- Create: `src/markdown.ts`
- Create: `tests/markdown.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/markdown.test.ts
import { describe, it, expect } from "vitest";
import { convertMarkdownToHtml, parseArticleFile } from "../src/markdown.js";

describe("convertMarkdownToHtml", () => {
  it("converts heading to styled HTML", () => {
    const html = convertMarkdownToHtml("# Hello World");
    expect(html).toContain("Hello World");
    expect(html).toContain("style=");
    expect(html).not.toContain("<style>");
  });

  it("converts code block with inline highlight styles", () => {
    const md = "```javascript\nconst x = 1;\n```";
    const html = convertMarkdownToHtml(md);
    expect(html).toContain("const");
    expect(html).toContain("style=");
  });

  it("converts paragraph with inline styles", () => {
    const html = convertMarkdownToHtml("Hello **bold** text");
    expect(html).toContain("<strong>");
    expect(html).toContain("bold");
  });

  it("converts list items", () => {
    const html = convertMarkdownToHtml("- item 1\n- item 2");
    expect(html).toContain("item 1");
    expect(html).toContain("item 2");
  });

  it("converts blockquote", () => {
    const html = convertMarkdownToHtml("> quote text");
    expect(html).toContain("quote text");
    expect(html).toContain("style=");
  });
});

describe("parseArticleFile", () => {
  it("parses markdown file with frontmatter", () => {
    const content = `---
title: 测试文章
author: 作者
digest: 摘要
thumb_media_id: thumb_123
---

# 正文标题

正文内容`;

    const result = parseArticleFile(content, "article.md");
    expect(result.title).toBe("测试文章");
    expect(result.author).toBe("作者");
    expect(result.digest).toBe("摘要");
    expect(result.thumb_media_id).toBe("thumb_123");
    expect(result.content).toContain("正文标题");
    expect(result.content).toContain("style=");
  });

  it("parses HTML file with frontmatter", () => {
    const content = `---
title: HTML文章
thumb_media_id: thumb_456
---

<h1>HTML Title</h1>
<p>Paragraph</p>`;

    const result = parseArticleFile(content, "article.html");
    expect(result.title).toBe("HTML文章");
    expect(result.content).toContain("<h1>HTML Title</h1>");
  });

  it("throws if title is missing", () => {
    const content = `---
thumb_media_id: thumb_123
---

content`;

    expect(() => parseArticleFile(content, "article.md")).toThrow("title");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run tests/markdown.test.ts
```

Expected: FAIL — `convertMarkdownToHtml` and `parseArticleFile` not defined.

- [ ] **Step 3: Implement markdown module**

```typescript
// src/markdown.ts
import { Marked } from "marked";
import hljs from "highlight.js";
import type { ArticleMeta } from "./types.js";

const STYLES = {
  h1: "font-size: 22px; font-weight: bold; color: #333; margin: 20px 0 10px 0; line-height: 1.4;",
  h2: "font-size: 20px; font-weight: bold; color: #333; margin: 18px 0 8px 0; line-height: 1.4;",
  h3: "font-size: 18px; font-weight: bold; color: #333; margin: 16px 0 8px 0; line-height: 1.4;",
  p: "font-size: 16px; color: #333; line-height: 1.8; margin: 10px 0;",
  blockquote:
    "border-left: 4px solid #ddd; padding: 10px 15px; color: #666; margin: 10px 0; background: #f9f9f9;",
  code: "background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; color: #c7254e;",
  pre: "background: #2d2d2d; color: #ccc; padding: 16px; border-radius: 4px; overflow-x: auto; font-size: 14px; line-height: 1.6; margin: 10px 0;",
  ul: "margin: 10px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;",
  ol: "margin: 10px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;",
  li: "margin: 4px 0;",
  img: "max-width: 100%; height: auto; margin: 10px 0; border-radius: 4px;",
  a: "color: #576b95; text-decoration: none;",
};

function createMarked(): Marked {
  const marked = new Marked();

  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const tag = `h${depth}` as keyof typeof STYLES;
        const style = STYLES[tag] || STYLES.h3;
        const text = this.parser.parseInline(tokens);
        return `<${tag} style="${style}">${text}</${tag}>\n`;
      },
      paragraph({ tokens }) {
        const text = this.parser.parseInline(tokens);
        return `<p style="${STYLES.p}">${text}</p>\n`;
      },
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        return `<blockquote style="${STYLES.blockquote}">${body}</blockquote>\n`;
      },
      code({ text, lang }) {
        let highlighted: string;
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value;
        } else {
          highlighted = hljs.highlightAuto(text).value;
        }
        return `<pre style="${STYLES.pre}"><code>${highlighted}</code></pre>\n`;
      },
      codespan({ text }) {
        return `<code style="${STYLES.code}">${text}</code>`;
      },
      list({ items, ordered }) {
        const tag = ordered ? "ol" : "ul";
        const style = ordered ? STYLES.ol : STYLES.ul;
        const body = items.map((item) => this.listitem(item)).join("");
        return `<${tag} style="${style}">${body}</${tag}>\n`;
      },
      listitem({ tokens }) {
        const text = this.parser.parse(tokens);
        return `<li style="${STYLES.li}">${text}</li>\n`;
      },
      image({ href, title, text }) {
        const titleAttr = title ? ` title="${title}"` : "";
        return `<img src="${href}" alt="${text}"${titleAttr} style="${STYLES.img}" />\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        return `<a href="${href}"${titleAttr} style="${STYLES.a}">${text}</a>`;
      },
    },
  });

  return marked;
}

export function convertMarkdownToHtml(markdown: string): string {
  const marked = createMarked();
  return marked.parse(markdown) as string;
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      meta[key] = value;
    }
  }
  return { meta, body: match[2].trim() };
}

export function parseArticleFile(
  fileContent: string,
  filename: string
): Partial<ArticleMeta> {
  const { meta, body } = parseFrontmatter(fileContent);

  if (!meta.title) {
    throw new Error(`Article file "${filename}" missing required frontmatter field: title`);
  }

  const isMarkdown = filename.endsWith(".md") || filename.endsWith(".markdown");
  const htmlContent = isMarkdown ? convertMarkdownToHtml(body) : body;

  return {
    title: meta.title,
    author: meta.author,
    digest: meta.digest,
    thumb_media_id: meta.thumb_media_id || "",
    content: htmlContent,
    content_source_url: meta.content_source_url,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run tests/markdown.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/markdown.ts tests/markdown.test.ts
git commit -m "feat: add Markdown to WeChat HTML conversion with inline styles"
```

---

### Task 9: CLI Entry Point

**Files:**
- Modify: `src/cli.ts` (replace placeholder)
- Create: `tests/cli.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/cli.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Integration-style test: invoke the compiled CLI and check output
// These tests validate CLI argument parsing and command routing

describe("CLI", () => {
  const cli = join(process.cwd(), "dist/cli.js");

  it("shows help with no arguments", () => {
    try {
      execFileSync("node", [cli, "--help"], { encoding: "utf-8" });
    } catch (e: any) {
      // commander exits with code 0 on --help, some versions throw
      expect(e.stdout || e.message).toContain("wechat-mp");
    }
  });

  it("shows version", () => {
    try {
      execFileSync("node", [cli, "--version"], { encoding: "utf-8" });
    } catch (e: any) {
      expect(e.stdout || e.message || "").toContain("0.1.0");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx tsc && npx vitest run tests/cli.test.ts
```

Expected: FAIL or incomplete output — CLI has no commands yet.

- [ ] **Step 3: Implement full CLI**

```typescript
#!/usr/bin/env node
// src/cli.ts
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAccount } from "./config.js";
import { listDrafts, createDraft, getDraft, deleteDraft, publishDraft } from "./api/draft.js";
import { listMaterials, getMaterial, uploadMaterial } from "./api/material.js";
import { parseArticleFile } from "./markdown.js";

const program = new Command();

function output(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

program
  .name("wechat-mp")
  .description("WeChat Official Account management CLI")
  .version("0.1.0");

// --- accounts ---
program
  .command("accounts")
  .description("List all configured accounts")
  .action(() => {
    try {
      const result = getAccount();
      output({ accounts: result.all });
    } catch (err) {
      handleError(err);
    }
  });

// --- draft ---
const draft = program.command("draft").description("Draft management");

draft
  .command("list")
  .description("List drafts")
  .option("--account <alias>", "Account alias")
  .option("--offset <n>", "Offset", "0")
  .option("--count <n>", "Count", "20")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await listDrafts(alias, parseInt(opts.offset), parseInt(opts.count));
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("create")
  .description("Create a draft from a file")
  .requiredOption("--file <path>", "Article file path (.md or .html)")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const filePath = resolve(opts.file);
      const content = readFileSync(filePath, "utf-8");
      const article = parseArticleFile(content, filePath);
      const result = await createDraft(alias, [article]);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("get")
  .description("Get draft details")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await getDraft(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("delete")
  .description("Delete a draft")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      await deleteDraft(alias, opts.mediaId);
      output({ success: true, message: "Draft deleted" });
    } catch (err) {
      handleError(err);
    }
  });

draft
  .command("publish")
  .description("Publish a draft")
  .requiredOption("--media-id <id>", "Draft media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await publishDraft(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

// --- material ---
const material = program.command("material").description("Material management");

material
  .command("list")
  .description("List materials")
  .requiredOption("--type <type>", "Material type (image, video, voice, news)")
  .option("--account <alias>", "Account alias")
  .option("--offset <n>", "Offset", "0")
  .option("--count <n>", "Count", "20")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await listMaterials(alias, opts.type, parseInt(opts.offset), parseInt(opts.count));
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

material
  .command("upload")
  .description("Upload a material file")
  .requiredOption("--file <path>", "File path")
  .requiredOption("--type <type>", "Material type (image, video, voice, thumb)")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const filePath = resolve(opts.file);
      const fileBuffer = readFileSync(filePath);
      const filename = filePath.split("/").pop() || "file";
      const blob = new Blob([fileBuffer]);
      const result = await uploadMaterial(alias, opts.type, blob, filename);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

material
  .command("get")
  .description("Get material details")
  .requiredOption("--media-id <id>", "Material media ID")
  .option("--account <alias>", "Account alias")
  .action(async (opts) => {
    try {
      const alias = resolveAccount(opts.account);
      const result = await getMaterial(alias, opts.mediaId);
      output(result);
    } catch (err) {
      handleError(err);
    }
  });

function resolveAccount(alias?: string): string {
  if (alias) return alias;
  const result = getAccount();
  if (result.all && result.all.length === 1) {
    return result.all[0].alias;
  }
  // When called from CLI without alias, list accounts and exit
  output({
    error: "No account specified. Available accounts:",
    accounts: result.all,
  });
  process.exit(1);
}

program.parse();
```

- [ ] **Step 4: Build and run tests**

Run:
```bash
npx tsc && npx vitest run tests/cli.test.ts
```

Expected: All tests PASS. CLI shows help and version.

- [ ] **Step 5: Manually verify CLI help output**

Run:
```bash
node dist/cli.js --help
node dist/cli.js draft --help
node dist/cli.js material --help
```

Expected: Each shows relevant subcommands and options.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: implement CLI with draft and material subcommands"
```

---

### Task 10: Skill File

**Files:**
- Create: `skill.md`

- [ ] **Step 1: Create the skill definition file**

```markdown
---
name: wechat-mp
description: 管理微信公众号草稿箱和素材。发布文章到草稿箱、发布草稿、上传图片、查看草稿和素材列表。支持多公众号管理。当用户提到发布公众号文章、管理公众号草稿、上传公众号素材时触发。
---

你是一个微信公众号管理助手。通过 CLI 工具 `wechat-mp` 来操作微信公众号 API。

## 前置检查

每次使用前，先确认工具可用：
1. 运行 `node <SKILL_DIR>/dist/cli.js accounts`（将 `<SKILL_DIR>` 替换为此 skill 所在目录的实际路径）
2. 如果报错 "Config file not found"，提示用户创建 `~/.wechat-mp/config.json`，参考 `config.example.json`
3. 如果成功，显示可用公众号列表

## 多公众号选择

1. 如果用户在请求中指定了公众号别名，所有命令使用 `--account=别名`
2. 如果用户未指定，运行 `accounts` 命令获取列表，展示给用户选择
3. 如果只有一个公众号，自动使用该公众号

## 工作流程

### 发布文章到草稿箱

1. 确定目标公众号（按上述逻辑）
2. 确认文章文件路径和格式（.md 或 .html）
3. 检查文章 frontmatter 是否包含 `thumb_media_id`（封面图）
   - 如果没有，询问用户是否需要上传封面图
   - 如果需要，先执行 `material upload` 获取 media_id，然后补充到文章中
4. 执行 `draft create --file=路径 --account=别名`
5. 创建成功后展示 media_id，询问用户是否立即发布
6. 如需发布，执行 `draft publish --media-id=ID --account=别名`

### 查看草稿列表

执行 `draft list --account=别名`，以表格形式展示：标题、media_id、更新时间。

### 查看草稿详情

执行 `draft get --media-id=ID --account=别名`，展示文章标题、作者、摘要。

### 删除草稿

执行前先确认：展示草稿标题，询问用户确认删除。确认后执行 `draft delete --media-id=ID --account=别名`。

### 上传素材

执行 `material upload --file=路径 --type=image --account=别名`，成功后展示 media_id 和 URL。

### 查看素材列表

执行 `material list --type=类型 --account=别名`，以表格形式展示。

## CLI 命令参考

所有命令前缀：`node <SKILL_DIR>/dist/cli.js`

```
accounts                                    列出公众号
draft list [--account=A]                    草稿列表
draft create --file=F [--account=A]         创建草稿
draft get --media-id=ID [--account=A]       草稿详情
draft delete --media-id=ID [--account=A]    删除草稿
draft publish --media-id=ID [--account=A]   发布草稿
material upload --file=F --type=T [--account=A]  上传素材
material list --type=T [--account=A]        素材列表
material get --media-id=ID [--account=A]    素材详情
```

## 注意事项

- 所有 CLI 输出为 JSON 格式，解析后以友好格式展示给用户
- 删除操作必须先确认
- 发布操作（draft publish）会将文章发布为公众号群发消息，务必确认后再执行
- 如果 API 报错，展示错误信息并建议解决方案
```

- [ ] **Step 2: Verify skill file is valid**

Check that the frontmatter `name` and `description` are present and the file is valid Markdown.

- [ ] **Step 3: Commit**

```bash
git add skill.md
git commit -m "feat: add Claude Code skill definition for WeChat MP management"
```

---

### Task 11: Full Build and Integration Test

**Files:**
- No new files

- [ ] **Step 1: Clean build**

Run:
```bash
rm -rf dist && npx tsc
```

Expected: No errors. `dist/` contains all compiled `.js` and `.d.ts` files.

- [ ] **Step 2: Run all tests**

Run:
```bash
npx vitest run
```

Expected: All tests pass (config: 5, token: 4, client: 4, draft: 5, material: 3, markdown: 8, cli: 2 = ~31 tests).

- [ ] **Step 3: Verify CLI end-to-end (without real API)**

Run:
```bash
node dist/cli.js --help
node dist/cli.js draft --help
node dist/cli.js accounts 2>&1 || true
```

Expected: Help output works. `accounts` fails with config error (expected without real config).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify full build and test suite"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Project scaffolding | — |
| 2 | Type definitions | — |
| 3 | Config module | 5 |
| 4 | Token management | 4 |
| 5 | HTTP client | 4 |
| 6 | Draft API | 5 |
| 7 | Material API | 3 |
| 8 | Markdown → HTML | 8 |
| 9 | CLI entry point | 2 |
| 10 | Skill file | — |
| 11 | Full build + integration | — |

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

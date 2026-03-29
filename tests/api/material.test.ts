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

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

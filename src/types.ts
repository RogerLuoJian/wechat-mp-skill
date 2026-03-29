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

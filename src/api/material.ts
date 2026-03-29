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

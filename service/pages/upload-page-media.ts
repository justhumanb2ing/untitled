import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.types";

const PAGE_MEDIA_BUCKET = "untitled-bucket";

export type PageMediaUploadPayload = {
  pageId: string;
  userId: string;
  file: File;
};

export type PageMediaUploadResult = {
  publicUrl: string;
  path: string;
};

/**
 * Creates an uploader that stores page media in Supabase Storage.
 */
export function createPageMediaUploader(
  supabasePromise: Promise<SupabaseClient<Database>>
) {
  return async function uploadPageMedia({
    pageId,
    userId,
    file,
  }: PageMediaUploadPayload): Promise<PageMediaUploadResult> {
    const supabase = await supabasePromise;
    const path = resolvePageMediaPath(userId, pageId, file);

    const { error } = await supabase.storage
      .from(PAGE_MEDIA_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from(PAGE_MEDIA_BUCKET)
      .getPublicUrl(path);

    if (!data.publicUrl) {
      throw new Error("Failed to resolve media URL.");
    }

    return {
      publicUrl: appendCacheKey(data.publicUrl, buildCacheKey(file)),
      path,
    };
  };
}

/**
 * Resolves a stable storage path for page media uploads.
 */
function resolvePageMediaPath(userId: string, pageId: string, file: File) {
  return `pages/${userId}/${pageId}/${resolveFileName(file.name)}`;
}

function resolveFileName(fileName: string) {
  const cleanedName = fileName.trim().replace(/[\\/]/g, "-");
  if (cleanedName.length > 0) {
    return cleanedName;
  }

  return `upload-${Date.now()}`;
}

function buildCacheKey(file: File) {
  return `${file.size}-${file.lastModified}`;
}

function appendCacheKey(publicUrl: string, cacheKey: string) {
  const separator = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${separator}v=${encodeURIComponent(cacheKey)}`;
}

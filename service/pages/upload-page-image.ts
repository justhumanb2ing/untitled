import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.types";

const PAGE_IMAGE_BUCKET = "untitled-bucket";

export type PageImageUploadPayload = {
  pageId: string;
  file: File;
};

export type PageImageUploadResult = {
  publicUrl: string;
  path: string;
};

/**
 * Creates an uploader that stores a page image in Supabase Storage.
 */
export function createPageImageUploader(
  supabasePromise: Promise<SupabaseClient<Database>>
) {
  return async function uploadPageImage({
    pageId,
    file,
  }: PageImageUploadPayload): Promise<PageImageUploadResult> {
    const supabase = await supabasePromise;
    const extension = resolveImageExtension(file);
    const uniqueId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    const path = `pages/${pageId}/profile-${uniqueId}.${extension}`;

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .getPublicUrl(path);

    if (!data.publicUrl) {
      throw new Error("Failed to resolve image URL.");
    }

    return { publicUrl: data.publicUrl, path };
  };
}

function resolveImageExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  if (nameExtension) {
    return nameExtension;
  }

  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

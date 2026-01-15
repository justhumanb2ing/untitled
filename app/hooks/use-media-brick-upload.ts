import { useCallback } from "react";

import { usePageMediaUploader } from "@/hooks/use-page-media-uploader";
import { toastManager } from "@/components/ui/toast";
import {
  getMediaValidationError,
  resolveMediaType,
  createPageGridBrickId,
  type PageGridMediaType,
} from "../../service/pages/page-grid";
import { trackUmamiEvent, createUmamiAttemptId } from "@/lib/umami";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/umami-events";

type MediaUploadHandlers = {
  onStart: (id: string, mediaType: PageGridMediaType) => void;
  onComplete: (id: string, publicUrl: string) => void;
  onError: (id: string) => void;
};

/**
 * Custom hook for managing media brick upload workflow.
 * Handles validation, upload orchestration, error handling, and analytics tracking.
 *
 * @param pageId - The ID of the page where the media will be uploaded
 * @param ownerId - The ID of the page owner
 * @param handlers - Callback handlers for different upload stages
 * @returns A function that initiates the upload process for a given file
 */
export function useMediaBrickUpload(
  pageId: string,
  ownerId: string,
  handlers: MediaUploadHandlers
) {
  const uploadPageMedia = usePageMediaUploader();

  return useCallback(
    async (file: File) => {
      // 1. Validate file
      const validationError = getMediaValidationError(file);
      if (validationError) {
        toastManager.add({
          type: "error",
          title: "Upload blocked",
          description: validationError,
        });
        return;
      }

      const mediaType = resolveMediaType(file);
      if (!mediaType) {
        toastManager.add({
          type: "error",
          title: "Unsupported file",
          description: "Only image or video files are supported.",
        });
        return;
      }

      // 2. Create placeholder and start tracking
      const id = createPageGridBrickId();
      const attemptId = createUmamiAttemptId("media");

      handlers.onStart(id, mediaType);

      trackUmamiEvent(
        UMAMI_EVENTS.feature.media.upload,
        {
          [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
          [UMAMI_PROP_KEYS.ctx.mediaType]: mediaType,
        },
        {
          dedupeKey: `media-upload:${attemptId}`,
          once: true,
        }
      );

      // 3. Perform async upload
      try {
        const { publicUrl } = await uploadPageMedia({
          pageId,
          userId: ownerId,
          file,
        });

        handlers.onComplete(id, publicUrl);

        trackUmamiEvent(
          UMAMI_EVENTS.feature.media.success,
          {
            [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
            [UMAMI_PROP_KEYS.ctx.mediaType]: mediaType,
          },
          {
            dedupeKey: `media-success:${attemptId}`,
            once: true,
          }
        );
      } catch (error) {
        handlers.onError(id);

        toastManager.add({
          type: "error",
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });

        trackUmamiEvent(
          UMAMI_EVENTS.feature.media.error,
          {
            [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
            [UMAMI_PROP_KEYS.ctx.mediaType]: mediaType,
            [UMAMI_PROP_KEYS.ctx.errorCode]: "upload_failed",
          },
          {
            dedupeKey: `media-error:${attemptId}`,
            once: true,
          }
        );
      }
    },
    [pageId, ownerId, uploadPageMedia, handlers]
  );
}

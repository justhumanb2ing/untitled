import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Layout } from "react-grid-layout";
import { isMobileWeb } from "@toss/utils";

import { getStrictContext } from "@/lib/get-strict-context";
import { usePageAutoSaveActions } from "@/components/page/page-auto-save-controller";
import { usePageMediaUploader } from "@/hooks/use-page-media-uploader";
import { toastManager } from "@/components/ui/toast";
import type { GridBreakpoint } from "@/config/grid-rule";
import type { BrickLinkRow, BrickMapRow } from "types/brick";
import {
  createUmamiAttemptId,
  trackUmamiEvent,
} from "@/lib/analytics/umami";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/analytics/umami-events";
import {
  applyLayoutToBricks,
  createPageGridBrick,
  createPageGridBrickId,
  getMediaValidationError,
  resolveMediaType,
  resolveTextBrickStatus,
  serializePageLayout,
  updateLinkBrickData,
  updateMediaBrickLinkData,
  updateMapBrickData,
  updatePageGridBrick,
  type PageGridBrick,
  type PageGridMediaType,
} from "../../../service/pages/page-grid";
import {
  MAP_DEFAULT_LAT,
  MAP_DEFAULT_LNG,
  MAP_DEFAULT_ZOOM,
  buildGoogleMapsHref,
} from "../../../constants/map";
import type { Json } from "types/database.types";

type PageGridState = {
  bricks: PageGridBrick[];
  shouldPersistDraft: boolean;
};

type PageGridActions = {
  addMediaFile: (file: File) => void;
  addTextBrick: () => void;
  addMapBrick: () => void;
  addLinkBrick: (url: string) => string;
  updateTextBrick: (payload: {
    id: string;
    text: string;
    rowSpan: number;
    breakpoint: GridBreakpoint;
    isEditing: boolean;
    persist?: boolean;
  }) => void;
  updateTextBrickRowSpanLocal: (payload: {
    id: string;
    rowSpan: number;
    breakpoint: GridBreakpoint;
  }) => void;
  updateLayout: (layout: Layout, breakpoint: GridBreakpoint) => void;
  removeBrick: (id: string) => void;
  isEditable: boolean;
  updateMapBrick: (payload: {
    id: string;
    data: Partial<BrickMapRow>;
  }) => void;
  updateMediaBrickLink: (payload: { id: string; linkUrl: string | null }) => void;
  updateLinkBrick: (payload: { id: string; data: BrickLinkRow }) => void;
};

const [PageGridStateProvider, usePageGridState] =
  getStrictContext<PageGridState>("PageGridState");
const [PageGridActionsProvider, usePageGridActions] =
  getStrictContext<PageGridActions>("PageGridActions");

type PageGridAction =
  | {
      type: "ADD_MEDIA_PLACEHOLDER";
      id: string;
      mediaType: PageGridMediaType;
    }
  | { type: "ADD_TEXT_PLACEHOLDER"; id: string }
  | {
      type: "ADD_MAP_PLACEHOLDER";
      id: string;
      lat: number;
      lng: number;
      zoom: number;
      href: string;
      caption: string | null;
    }
  | { type: "ADD_LINK_PLACEHOLDER"; id: string; url: string }
  | {
      type: "COMPLETE_MEDIA_UPLOAD";
      id: string;
      publicUrl: string;
    }
  | {
      type: "UPDATE_TEXT_BRICK";
      id: string;
      text: string;
      rowSpan: number;
      breakpoint: GridBreakpoint;
      isEditing: boolean;
      persist?: boolean;
    }
  | {
      type: "UPDATE_TEXT_BRICK_ROWSPAN_LOCAL";
      id: string;
      rowSpan: number;
      breakpoint: GridBreakpoint;
    }
  | {
      type: "UPDATE_MAP_BRICK";
      id: string;
      data: Partial<BrickMapRow>;
    }
  | {
      type: "UPDATE_MEDIA_LINK";
      id: string;
      linkUrl: string | null;
    }
  | {
      type: "UPDATE_LINK_BRICK";
      id: string;
      data: BrickLinkRow;
    }
  | { type: "REMOVE_BRICK"; id: string }
  | {
      type: "APPLY_LAYOUT";
      layout: Layout;
      breakpoint: GridBreakpoint;
    };

function pageGridReducer(
  state: PageGridState,
  action: PageGridAction
): PageGridState {
  switch (action.type) {
    case "ADD_MEDIA_PLACEHOLDER": {
      const brick = createPageGridBrick({
        id: action.id,
        type: action.mediaType,
        status: "uploading",
        bricks: state.bricks,
      });

      return {
        bricks: [...state.bricks, brick],
        shouldPersistDraft: true,
      };
    }
    case "COMPLETE_MEDIA_UPLOAD": {
      const timestamp = new Date().toISOString();

      return {
        bricks: state.bricks.map((brick) =>
          brick.id === action.id
            ? updatePageGridBrick(brick, {
                url: action.publicUrl,
                status: "ready",
                timestamp,
              })
            : brick
        ),
        shouldPersistDraft: true,
      };
    }
    case "ADD_TEXT_PLACEHOLDER": {
      const brick = createPageGridBrick({
        id: action.id,
        type: "text",
        status: "draft",
        bricks: state.bricks,
      });

      return {
        bricks: [...state.bricks, brick],
        shouldPersistDraft: true,
      };
    }
    case "ADD_MAP_PLACEHOLDER": {
      const brick = createPageGridBrick({
        id: action.id,
        type: "map",
        status: "ready",
        bricks: state.bricks,
        payload: {
          lat: action.lat,
          lng: action.lng,
          zoom: action.zoom,
          href: action.href,
          caption: action.caption,
        },
      });

      return {
        bricks: [...state.bricks, brick],
        shouldPersistDraft: true,
      };
    }
    case "ADD_LINK_PLACEHOLDER": {
      const brick = createPageGridBrick({
        id: action.id,
        type: "link",
        status: "uploading",
        bricks: state.bricks,
        payload: {
          url: action.url,
        },
      });

      return {
        bricks: [...state.bricks, brick],
        shouldPersistDraft: true,
      };
    }
    case "UPDATE_TEXT_BRICK": {
      let didUpdate = false;
      const nextBricks = state.bricks.map((brick) => {
        if (brick.id !== action.id || brick.type !== "text") {
          return brick;
        }

        const nextStatus = resolveTextBrickStatus(
          action.text,
          action.isEditing
        );
        const currentGrid = brick.style[action.breakpoint].grid;
        const nextGrid = {
          ...currentGrid,
          h: action.rowSpan,
        };
        const shouldUpdate =
          brick.data.text !== action.text ||
          brick.status !== nextStatus ||
          currentGrid.h !== action.rowSpan;

        if (!shouldUpdate) {
          return brick;
        }

        didUpdate = true;
        return updatePageGridBrick(brick, {
          text: action.text,
          status: nextStatus,
          grid: nextGrid,
          breakpoint: action.breakpoint,
        });
      });

      if (!didUpdate) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: action.persist ?? true,
      };
    }
    case "UPDATE_TEXT_BRICK_ROWSPAN_LOCAL": {
      let didUpdate = false;
      const nextBricks = state.bricks.map((brick) => {
        if (brick.id !== action.id || brick.type !== "text") {
          return brick;
        }

        const currentGrid = brick.style[action.breakpoint].grid;
        if (currentGrid.h === action.rowSpan) {
          return brick;
        }

        didUpdate = true;
        return {
          ...brick,
          style: {
            ...brick.style,
            [action.breakpoint]: {
              grid: { ...currentGrid, h: action.rowSpan },
            },
          },
        };
      });

      if (!didUpdate) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: false,
      };
    }
    case "REMOVE_BRICK":
      return {
        bricks: state.bricks.filter((brick) => brick.id !== action.id),
        shouldPersistDraft: true,
      };
    case "APPLY_LAYOUT": {
      const nextBricks = applyLayoutToBricks(
        state.bricks,
        action.layout,
        action.breakpoint
      );

      if (nextBricks === state.bricks) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: true,
      };
    }
    case "UPDATE_MAP_BRICK": {
      let didUpdate = false;
      const nextBricks = state.bricks.map((brick) => {
        if (brick.id !== action.id || brick.type !== "map") {
          return brick;
        }

        const updatedBrick = updateMapBrickData(brick, action.data);
        if (updatedBrick === brick) {
          return brick;
        }

        didUpdate = true;
        return updatedBrick;
      });

      if (!didUpdate) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: true,
      };
    }
    case "UPDATE_LINK_BRICK": {
      let didUpdate = false;
      const timestamp = new Date().toISOString();
      const nextBricks = state.bricks.map((brick) => {
        if (brick.id !== action.id || brick.type !== "link") {
          return brick;
        }

        const updatedBrick = updateLinkBrickData(
          brick,
          action.data,
          timestamp
        );
        const nextBrick =
          updatedBrick === brick && brick.status === "ready"
            ? brick
            : {
                ...updatedBrick,
                status: "ready",
                updated_at: timestamp,
              };

        if (nextBrick === brick) {
          return brick;
        }

        didUpdate = true;
        return nextBrick;
      });

      if (!didUpdate) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: true,
      };
    }
    case "UPDATE_MEDIA_LINK": {
      let didUpdate = false;
      const nextBricks = state.bricks.map((brick) => {
        if (
          brick.id !== action.id ||
          (brick.type !== "image" && brick.type !== "video")
        ) {
          return brick;
        }

        const updatedBrick = updateMediaBrickLinkData(brick, action.linkUrl);
        if (updatedBrick === brick) {
          return brick;
        }

        didUpdate = true;
        return updatedBrick;
      });

      if (!didUpdate) {
        return state;
      }

      return {
        bricks: nextBricks,
        shouldPersistDraft: true,
      };
    }
    default:
      return state;
  }
}

interface PageGridProviderProps {
  pageId: string;
  ownerId: string;
  isOwner: boolean;
  initialBricks?: PageGridBrick[];
  children: ReactNode;
}

/**
 * Coordinates grid state updates, uploads, and page layout auto-save.
 */
export function PageGridProvider({
  pageId,
  ownerId,
  isOwner,
  initialBricks = [],
  children,
}: PageGridProviderProps) {
  const isEditable = isOwner && !isMobileWeb();
  const [state, dispatch] = useReducer(pageGridReducer, {
    bricks: initialBricks,
    shouldPersistDraft: true,
  });
  const uploadPageMedia = usePageMediaUploader();
  const { updateDraft } = usePageAutoSaveActions();

  const addMediaFile = useCallback(
    (file: File) => {
      if (!isEditable) {
        return;
      }

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

      const id = createPageGridBrickId();
      const attemptId = createUmamiAttemptId("media");
      dispatch({ type: "ADD_MEDIA_PLACEHOLDER", id, mediaType });
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

      void (async () => {
        try {
          const { publicUrl } = await uploadPageMedia({
            pageId,
            userId: ownerId,
            file,
          });

          dispatch({ type: "COMPLETE_MEDIA_UPLOAD", id, publicUrl });
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
          dispatch({ type: "REMOVE_BRICK", id });
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
      })();
    },
    [isEditable, ownerId, pageId, uploadPageMedia]
  );

  const addTextBrick = useCallback(() => {
    if (!isEditable) {
      return;
    }

    const id = createPageGridBrickId();
    dispatch({ type: "ADD_TEXT_PLACEHOLDER", id });
  }, [isEditable]);

  const addMapBrick = useCallback(() => {
    if (!isEditable) {
      return;
    }

    const id = createPageGridBrickId();
    dispatch({
      type: "ADD_MAP_PLACEHOLDER",
      id,
      lat: MAP_DEFAULT_LAT,
      lng: MAP_DEFAULT_LNG,
      zoom: MAP_DEFAULT_ZOOM,
      href: buildGoogleMapsHref(
        MAP_DEFAULT_LAT,
        MAP_DEFAULT_LNG,
        MAP_DEFAULT_ZOOM
      ),
      caption: null,
    });
  }, [isEditable]);

  const addLinkBrick = useCallback(
    (url: string) => {
      if (!isEditable) {
        return "";
      }

      const id = createPageGridBrickId();
      dispatch({ type: "ADD_LINK_PLACEHOLDER", id, url });
      return id;
    },
    [isEditable]
  );

  const updateTextBrick = useCallback(
    ({
      id,
      text,
      rowSpan,
      breakpoint,
      isEditing,
      persist,
    }: {
      id: string;
      text: string;
      rowSpan: number;
      breakpoint: GridBreakpoint;
      isEditing: boolean;
      persist?: boolean;
    }) => {
      if (!isEditable) {
        return;
      }

      dispatch({
        type: "UPDATE_TEXT_BRICK",
        id,
        text,
        rowSpan,
        breakpoint,
        isEditing,
        persist,
      });
    },
    [isEditable]
  );

  const updateTextBrickRowSpanLocal = useCallback(
    ({
      id,
      rowSpan,
      breakpoint,
    }: {
      id: string;
      rowSpan: number;
      breakpoint: GridBreakpoint;
    }) => {
      dispatch({
        type: "UPDATE_TEXT_BRICK_ROWSPAN_LOCAL",
        id,
        rowSpan,
        breakpoint,
      });
    },
    []
  );

  const updateLayout = useCallback(
    (layout: Layout, breakpoint: GridBreakpoint) => {
      if (!isEditable) {
        return;
      }

      dispatch({ type: "APPLY_LAYOUT", layout, breakpoint });
    },
    [isEditable]
  );

  const removeBrick = useCallback(
    (id: string) => {
      if (!isEditable) {
        return;
      }

      dispatch({ type: "REMOVE_BRICK", id });
    },
    [isEditable]
  );

  const updateMapBrick = useCallback(
    (payload: { id: string; data: Partial<BrickMapRow> }) => {
      if (!isEditable) {
        return;
      }

      dispatch({
        type: "UPDATE_MAP_BRICK",
        id: payload.id,
        data: payload.data,
      });
    },
    [isEditable]
  );

  const updateMediaBrickLink = useCallback(
    (payload: { id: string; linkUrl: string | null }) => {
      if (!isEditable) {
        return;
      }

      dispatch({
        type: "UPDATE_MEDIA_LINK",
        id: payload.id,
        linkUrl: payload.linkUrl,
      });
    },
    [isEditable]
  );

  const updateLinkBrick = useCallback(
    (payload: { id: string; data: BrickLinkRow }) => {
      if (!isEditable) {
        return;
      }

      dispatch({
        type: "UPDATE_LINK_BRICK",
        id: payload.id,
        data: payload.data,
      });
    },
    [isEditable]
  );

  const layoutSnapshot = useMemo(
    () => serializePageLayout(state.bricks),
    [state.bricks]
  );

  useEffect(() => {
    if (!isEditable) {
      return;
    }

    if (!state.shouldPersistDraft) {
      return;
    }

    updateDraft({ layout: layoutSnapshot as Json });
  }, [isEditable, layoutSnapshot, updateDraft, state.shouldPersistDraft]);

  const stateValue = useMemo(
    () => ({
      bricks: state.bricks,
      shouldPersistDraft: state.shouldPersistDraft,
    }),
    [state.bricks, state.shouldPersistDraft]
  );
  const actionsValue = useMemo(
    () => ({
      addMediaFile,
      addTextBrick,
      addMapBrick,
      addLinkBrick,
      updateTextBrick,
      updateTextBrickRowSpanLocal,
      updateLayout,
      removeBrick,
      updateMapBrick,
      updateMediaBrickLink,
      updateLinkBrick,
      isEditable,
    }),
    [
      addMediaFile,
      addTextBrick,
      addMapBrick,
      addLinkBrick,
      updateLayout,
      updateTextBrick,
      updateTextBrickRowSpanLocal,
      removeBrick,
      updateMapBrick,
      updateMediaBrickLink,
      updateLinkBrick,
      isEditable,
    ]
  );

  return (
    <PageGridActionsProvider value={actionsValue}>
      <PageGridStateProvider value={stateValue}>
        {children}
      </PageGridStateProvider>
    </PageGridActionsProvider>
  );
}

export { usePageGridActions, usePageGridState };

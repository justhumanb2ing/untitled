import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Layout } from "react-grid-layout";

import { getStrictContext } from "@/lib/get-strict-context";
import { usePageAutoSaveActions } from "@/components/page/page-auto-save-controller";
import { usePageMediaUploader } from "@/hooks/use-page-media-uploader";
import { toastManager } from "@/components/ui/toast";
import type { GridBreakpoint } from "@/config/grid-rule";
import {
  applyLayoutToBricks,
  createPageGridBrick,
  createPageGridBrickId,
  getMediaValidationError,
  resolveMediaType,
  resolveTextBrickStatus,
  serializePageLayout,
  updatePageGridBrick,
  type PageGridBrick,
  type PageGridMediaType,
} from "../../../service/pages/page-grid";
import type { Json } from "types/database.types";

type PageGridState = {
  bricks: PageGridBrick[];
  shouldPersistDraft: boolean;
};

type PageGridActions = {
  addMediaFile: (file: File) => void;
  addTextBrick: () => void;
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
  isEditable: boolean;
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
    case "APPLY_LAYOUT":
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
  const [state, dispatch] = useReducer(pageGridReducer, {
    bricks: initialBricks,
    shouldPersistDraft: true,
  });
  const uploadPageMedia = usePageMediaUploader();
  const { updateDraft } = usePageAutoSaveActions();

  const addMediaFile = useCallback(
    (file: File) => {
      if (!isOwner) {
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
      dispatch({ type: "ADD_MEDIA_PLACEHOLDER", id, mediaType });

      void (async () => {
        try {
          const { publicUrl } = await uploadPageMedia({
            pageId,
            userId: ownerId,
            file,
          });

          dispatch({ type: "COMPLETE_MEDIA_UPLOAD", id, publicUrl });
        } catch (error) {
          dispatch({ type: "REMOVE_BRICK", id });
          toastManager.add({
            type: "error",
            title: "Upload failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
          });
        }
      })();
    },
    [isOwner, ownerId, pageId, uploadPageMedia]
  );

  const addTextBrick = useCallback(() => {
    if (!isOwner) {
      return;
    }

    const id = createPageGridBrickId();
    dispatch({ type: "ADD_TEXT_PLACEHOLDER", id });
  }, [isOwner]);

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
      if (!isOwner) {
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
    [isOwner]
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
      dispatch({ type: "APPLY_LAYOUT", layout, breakpoint });
    },
    []
  );

  const layoutSnapshot = useMemo(
    () => serializePageLayout(state.bricks),
    [state.bricks]
  );

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    if (!state.shouldPersistDraft) {
      return;
    }

    updateDraft({ layout: layoutSnapshot as Json });
  }, [isOwner, layoutSnapshot, updateDraft, state.shouldPersistDraft]);

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
      updateTextBrick,
      updateTextBrickRowSpanLocal,
      updateLayout,
      isEditable: isOwner,
    }),
    [
      addMediaFile,
      addTextBrick,
      updateLayout,
      updateTextBrick,
      updateTextBrickRowSpanLocal,
      isOwner,
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

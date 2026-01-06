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
  serializePageLayout,
  updatePageGridBrick,
  type PageGridBrick,
  type PageGridMediaType,
} from "../../../service/pages/page-grid";
import type { Json } from "types/database.types";

type PageGridState = {
  bricks: PageGridBrick[];
};

type PageGridActions = {
  addMediaFile: (file: File) => void;
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
  | {
      type: "COMPLETE_MEDIA_UPLOAD";
      id: string;
      publicUrl: string;
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
      };
    }
    case "REMOVE_BRICK":
      return {
        bricks: state.bricks.filter((brick) => brick.id !== action.id),
      };
    case "APPLY_LAYOUT":
      return {
        bricks: applyLayoutToBricks(state.bricks, action.layout, action.breakpoint),
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

    updateDraft({ layout: (layoutSnapshot) as Json });
  }, [isOwner, layoutSnapshot, updateDraft]);

  const stateValue = useMemo(
    () => ({ bricks: state.bricks }),
    [state.bricks]
  );
  const actionsValue = useMemo(
    () => ({ addMediaFile, updateLayout, isEditable: isOwner }),
    [addMediaFile, updateLayout, isOwner]
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

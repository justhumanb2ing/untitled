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
import { usePageAutoSaveActions } from "@/hooks/page/use-page-auto-save-controller";
import { useMediaBrickUpload } from "@/hooks/use-media-brick-upload";
import { useEditableAction } from "@/hooks/use-editable-action";
import {
  handleAddMediaPlaceholder,
  handleCompleteMediaUpload,
  handleAddTextPlaceholder,
  handleAddMapPlaceholder,
  handleAddLinkPlaceholder,
  handleUpdateTextBrick,
  handleUpdateTextBrickRowSpanLocal,
  handleRemoveBrick,
  handleApplyLayout,
  handleUpdateMapBrick,
  handleUpdateLinkBrick,
  handleUpdateMediaLink,
  type PageGridState,
} from "../../utils/page-grid-reducer-handlers";
import type { GridBreakpoint } from "@/config/grid-rule";
import type { BrickLinkRow, BrickMapRow } from "types/brick";
import {
  createPageGridBrickId,
  serializePageLayout,
  type PageGridBrick,
  type PageGridMediaType,
} from "../../../service/pages/page-grid";
import {
  MAP_DEFAULT_LAT,
  MAP_DEFAULT_LNG,
  MAP_DEFAULT_ZOOM,
  buildGoogleMapsHref,
} from "../../utils/map";
import type { Json } from "types/database.types";

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
    case "ADD_MEDIA_PLACEHOLDER":
      return handleAddMediaPlaceholder(state, action);
    case "COMPLETE_MEDIA_UPLOAD":
      return handleCompleteMediaUpload(state, action);
    case "ADD_TEXT_PLACEHOLDER":
      return handleAddTextPlaceholder(state, action);
    case "ADD_MAP_PLACEHOLDER":
      return handleAddMapPlaceholder(state, action);
    case "ADD_LINK_PLACEHOLDER":
      return handleAddLinkPlaceholder(state, action);
    case "UPDATE_TEXT_BRICK":
      return handleUpdateTextBrick(state, action);
    case "UPDATE_TEXT_BRICK_ROWSPAN_LOCAL":
      return handleUpdateTextBrickRowSpanLocal(state, action);
    case "REMOVE_BRICK":
      return handleRemoveBrick(state, action);
    case "APPLY_LAYOUT":
      return handleApplyLayout(state, action);
    case "UPDATE_MAP_BRICK":
      return handleUpdateMapBrick(state, action);
    case "UPDATE_LINK_BRICK":
      return handleUpdateLinkBrick(state, action);
    case "UPDATE_MEDIA_LINK":
      return handleUpdateMediaLink(state, action);
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
  const updateDraft = usePageAutoSaveActions((actions) => actions.updateDraft);

  const uploadHandlers = useMemo(
    () => ({
      onStart: (id: string, mediaType: PageGridMediaType) => {
        dispatch({ type: "ADD_MEDIA_PLACEHOLDER", id, mediaType });
      },
      onComplete: (id: string, publicUrl: string) => {
        dispatch({ type: "COMPLETE_MEDIA_UPLOAD", id, publicUrl });
      },
      onError: (id: string) => {
        dispatch({ type: "REMOVE_BRICK", id });
      },
    }),
    []
  );

  const uploadMedia = useMediaBrickUpload(pageId, ownerId, uploadHandlers);

  const addMediaFile = useCallback(
    (file: File) => {
      if (!isEditable) {
        return;
      }

      void uploadMedia(file);
    },
    [isEditable, uploadMedia]
  );

  const addTextBrickImpl = useCallback(() => {
    const id = createPageGridBrickId();
    dispatch({ type: "ADD_TEXT_PLACEHOLDER", id });
  }, []);

  const addTextBrick = useEditableAction(isEditable, addTextBrickImpl);

  const addMapBrickImpl = useCallback(() => {
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
  }, []);

  const addMapBrick = useEditableAction(isEditable, addMapBrickImpl);

  const addLinkBrickImpl = useCallback((url: string) => {
    const id = createPageGridBrickId();
    dispatch({ type: "ADD_LINK_PLACEHOLDER", id, url });
    return id;
  }, []);

  const addLinkBrick = useEditableAction(isEditable, addLinkBrickImpl);

  const updateTextBrickImpl = useCallback(
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
    []
  );

  const updateTextBrick = useEditableAction(isEditable, updateTextBrickImpl);

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

  const updateLayoutImpl = useCallback(
    (layout: Layout, breakpoint: GridBreakpoint) => {
      dispatch({ type: "APPLY_LAYOUT", layout, breakpoint });
    },
    []
  );

  const updateLayout = useEditableAction(isEditable, updateLayoutImpl);

  const removeBrickImpl = useCallback((id: string) => {
    dispatch({ type: "REMOVE_BRICK", id });
  }, []);

  const removeBrick = useEditableAction(isEditable, removeBrickImpl);

  const updateMapBrickImpl = useCallback(
    (payload: { id: string; data: Partial<BrickMapRow> }) => {
      dispatch({
        type: "UPDATE_MAP_BRICK",
        id: payload.id,
        data: payload.data,
      });
    },
    []
  );

  const updateMapBrick = useEditableAction(isEditable, updateMapBrickImpl);

  const updateMediaBrickLinkImpl = useCallback(
    (payload: { id: string; linkUrl: string | null }) => {
      dispatch({
        type: "UPDATE_MEDIA_LINK",
        id: payload.id,
        linkUrl: payload.linkUrl,
      });
    },
    []
  );

  const updateMediaBrickLink = useEditableAction(
    isEditable,
    updateMediaBrickLinkImpl
  );

  const updateLinkBrickImpl = useCallback(
    (payload: { id: string; data: BrickLinkRow }) => {
      dispatch({
        type: "UPDATE_LINK_BRICK",
        id: payload.id,
        data: payload.data,
      });
    },
    []
  );

  const updateLinkBrick = useEditableAction(isEditable, updateLinkBrickImpl);

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

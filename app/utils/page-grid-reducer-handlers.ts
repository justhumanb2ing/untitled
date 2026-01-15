import {
  createPageGridBrick,
  updatePageGridBrick,
  resolveTextBrickStatus,
  applyLayoutToBricks,
  updateMapBrickData,
  updateLinkBrickData,
  updateMediaBrickLinkData,
  type PageGridBrick,
  type PageGridMediaType,
} from "../../service/pages/page-grid";
import type { Layout } from "react-grid-layout";
import type { GridBreakpoint } from "@/config/grid-rule";
import type { BrickLinkRow, BrickMapRow } from "types/brick";

export type PageGridState = {
  bricks: PageGridBrick[];
  shouldPersistDraft: boolean;
};

/**
 * Handles adding a media placeholder brick to the state.
 */
export function handleAddMediaPlaceholder(
  state: PageGridState,
  payload: { id: string; mediaType: PageGridMediaType }
): PageGridState {
  const brick = createPageGridBrick({
    id: payload.id,
    type: payload.mediaType,
    status: "uploading",
    bricks: state.bricks,
  });

  return {
    bricks: [...state.bricks, brick],
    shouldPersistDraft: true,
  };
}

/**
 * Handles completing a media upload by updating the brick with the public URL.
 */
export function handleCompleteMediaUpload(
  state: PageGridState,
  payload: { id: string; publicUrl: string }
): PageGridState {
  const timestamp = new Date().toISOString();

  return {
    bricks: state.bricks.map((brick) =>
      brick.id === payload.id
        ? updatePageGridBrick(brick, {
            url: payload.publicUrl,
            status: "ready",
            timestamp,
          })
        : brick
    ),
    shouldPersistDraft: true,
  };
}

/**
 * Handles adding a text placeholder brick to the state.
 */
export function handleAddTextPlaceholder(
  state: PageGridState,
  payload: { id: string }
): PageGridState {
  const brick = createPageGridBrick({
    id: payload.id,
    type: "text",
    status: "draft",
    bricks: state.bricks,
  });

  return {
    bricks: [...state.bricks, brick],
    shouldPersistDraft: true,
  };
}

/**
 * Handles adding a map placeholder brick to the state.
 */
export function handleAddMapPlaceholder(
  state: PageGridState,
  payload: {
    id: string;
    lat: number;
    lng: number;
    zoom: number;
    href: string;
    caption: string | null;
  }
): PageGridState {
  const brick = createPageGridBrick({
    id: payload.id,
    type: "map",
    status: "ready",
    bricks: state.bricks,
    payload: {
      lat: payload.lat,
      lng: payload.lng,
      zoom: payload.zoom,
      href: payload.href,
      caption: payload.caption,
    },
  });

  return {
    bricks: [...state.bricks, brick],
    shouldPersistDraft: true,
  };
}

/**
 * Handles adding a link placeholder brick to the state.
 */
export function handleAddLinkPlaceholder(
  state: PageGridState,
  payload: { id: string; url: string }
): PageGridState {
  const brick = createPageGridBrick({
    id: payload.id,
    type: "link",
    status: "uploading",
    bricks: state.bricks,
    payload: {
      url: payload.url,
    },
  });

  return {
    bricks: [...state.bricks, brick],
    shouldPersistDraft: true,
  };
}

/**
 * Handles updating a text brick's content, row span, and status.
 */
export function handleUpdateTextBrick(
  state: PageGridState,
  payload: {
    id: string;
    text: string;
    rowSpan: number;
    breakpoint: GridBreakpoint;
    isEditing: boolean;
    persist?: boolean;
  }
): PageGridState {
  let didUpdate = false;
  const nextBricks = state.bricks.map((brick) => {
    if (brick.id !== payload.id || brick.type !== "text") {
      return brick;
    }

    const nextStatus = resolveTextBrickStatus(payload.text, payload.isEditing);
    const currentGrid = brick.style[payload.breakpoint].grid;
    const nextGrid = {
      ...currentGrid,
      h: payload.rowSpan,
    };
    const shouldUpdate =
      brick.data.text !== payload.text ||
      brick.status !== nextStatus ||
      currentGrid.h !== payload.rowSpan;

    if (!shouldUpdate) {
      return brick;
    }

    didUpdate = true;
    return updatePageGridBrick(brick, {
      text: payload.text,
      status: nextStatus,
      grid: nextGrid,
      breakpoint: payload.breakpoint,
    });
  });

  if (!didUpdate) {
    return state;
  }

  return {
    bricks: nextBricks,
    shouldPersistDraft: payload.persist ?? true,
  };
}

/**
 * Handles updating a text brick's row span locally without persisting.
 */
export function handleUpdateTextBrickRowSpanLocal(
  state: PageGridState,
  payload: {
    id: string;
    rowSpan: number;
    breakpoint: GridBreakpoint;
  }
): PageGridState {
  let didUpdate = false;
  const nextBricks = state.bricks.map((brick) => {
    if (brick.id !== payload.id || brick.type !== "text") {
      return brick;
    }

    const currentGrid = brick.style[payload.breakpoint].grid;
    if (currentGrid.h === payload.rowSpan) {
      return brick;
    }

    didUpdate = true;
    return {
      ...brick,
      style: {
        ...brick.style,
        [payload.breakpoint]: {
          grid: { ...currentGrid, h: payload.rowSpan },
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

/**
 * Handles removing a brick from the state.
 */
export function handleRemoveBrick(
  state: PageGridState,
  payload: { id: string }
): PageGridState {
  return {
    bricks: state.bricks.filter((brick) => brick.id !== payload.id),
    shouldPersistDraft: true,
  };
}

/**
 * Handles applying a layout update to all bricks for the given breakpoint.
 */
export function handleApplyLayout(
  state: PageGridState,
  payload: { layout: Layout; breakpoint: GridBreakpoint }
): PageGridState {
  const nextBricks = applyLayoutToBricks(
    state.bricks,
    payload.layout,
    payload.breakpoint
  );

  if (nextBricks === state.bricks) {
    return state;
  }

  return {
    bricks: nextBricks,
    shouldPersistDraft: true,
  };
}

/**
 * Handles updating a map brick's data.
 */
export function handleUpdateMapBrick(
  state: PageGridState,
  payload: { id: string; data: Partial<BrickMapRow> }
): PageGridState {
  let didUpdate = false;
  const nextBricks = state.bricks.map((brick) => {
    if (brick.id !== payload.id || brick.type !== "map") {
      return brick;
    }

    const updatedBrick = updateMapBrickData(brick, payload.data);
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

/**
 * Handles updating a link brick's data.
 */
export function handleUpdateLinkBrick(
  state: PageGridState,
  payload: { id: string; data: BrickLinkRow }
): PageGridState {
  let didUpdate = false;
  const timestamp = new Date().toISOString();
  const nextBricks = state.bricks.map((brick) => {
    if (brick.id !== payload.id || brick.type !== "link") {
      return brick;
    }

    const updatedBrick = updateLinkBrickData(brick, payload.data, timestamp);
    const nextBrick =
      updatedBrick === brick && brick.status === "ready"
        ? brick
        : {
            ...updatedBrick,
            status: "ready" as const,
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

/**
 * Handles updating a media brick's link URL.
 */
export function handleUpdateMediaLink(
  state: PageGridState,
  payload: { id: string; linkUrl: string | null }
): PageGridState {
  let didUpdate = false;
  const nextBricks = state.bricks.map((brick) => {
    if (
      brick.id !== payload.id ||
      (brick.type !== "image" && brick.type !== "video")
    ) {
      return brick;
    }

    const updatedBrick = updateMediaBrickLinkData(brick, payload.linkUrl);
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

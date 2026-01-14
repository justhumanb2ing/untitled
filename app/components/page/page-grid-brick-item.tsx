import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  MapCanvas,
  type MapCanvasControls,
  type MapCanvasViewport,
} from "@/components/map/map-canvas";
import { Item } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import EditableParagraph from "@/components/profile/editable-paragraph";
import PageGridTextBrick from "@/components/page/page-grid-text-brick";
import type { GridBreakpoint, GridSize } from "@/config/grid-rule";
import { cn } from "@/lib/utils";
import { resolveExternalHref } from "@/utils/resolve-external-href";
import { usePageGridActions } from "@/components/page/page-grid-context";
import { MAP_DEFAULT_ZOOM } from "../../utils/map";
import type {
  PageGridBrick,
  PageGridBrickType,
} from "../../../service/pages/page-grid";
import {
  buildLinkBrickViewModel,
  type LinkBrickVariant,
} from "../../../service/pages/link-brick-view-model";
import { ArrowCircleUpRightIcon, LinkSimpleIcon } from "@phosphor-icons/react";
import type { BrickImageRow, BrickVideoRow } from "types/brick";

type MapControlsOverrides = {
  center?: [number, number] | null;
  controlsPanelOpen?: boolean;
  onControlsChange?: (controls: MapCanvasControls | null) => void;
  onViewportChange?: (viewport: MapCanvasViewport) => void;
};

type BrickRendererMap = {
  [K in PageGridBrickType]: (payload: {
    brick: PageGridBrick<K>;
    rowHeight: number;
    breakpoint: GridBreakpoint;
    grid: GridSize;
    mapOverrides?: MapControlsOverrides;
  }) => ReactNode;
};

const BRICK_RENDERERS: BrickRendererMap = {
  text: ({ brick, rowHeight, breakpoint }) => (
    <PageGridTextBrick
      brick={brick}
      rowHeight={rowHeight}
      breakpoint={breakpoint}
    />
  ),
  link: ({ brick, grid }) => renderLinkBrick(brick, grid),
  map: ({ brick, mapOverrides }) => (
    <MapBrickContent brick={brick} mapOverrides={mapOverrides} />
  ),
  image: ({ brick }) =>
    renderMediaFrame(
      brick,
      brick.data.image_url ? (
        <img
          src={brick.data.image_url}
          alt="Uploaded image"
          className="h-full w-full object-cover"
        />
      ) : null
    ),
  video: ({ brick }) =>
    renderMediaFrame(
      brick,
      brick.data.video_url ? (
        <video
          src={brick.data.video_url}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
          loop
          autoPlay
        />
      ) : null
    ),
};

interface PageGridBrickItemProps {
  brick: PageGridBrick;
  rowHeight: number;
  breakpoint: GridBreakpoint;
  mapOverrides?: MapControlsOverrides;
}

export default function PageGridBrickItem({
  brick,
  rowHeight,
  breakpoint,
  mapOverrides,
}: PageGridBrickItemProps) {
  return (
    <Item
      variant="muted"
      className={cn(
        "h-full w-full rounded-3xl p-0 bg-background",
        brick.type === "link" && "rounded-xl"
      )}
      render={
        <div
          className={cn(
            "h-full w-full min-h-0 min-w-0 self-stretch",
            brick.type !== "text" &&
              "shadow-[0px_6px_13px_-6px_rgba(0,0,0,0.1)] border-none ring ring-[#e5e5e5] dark:ring-[#2b2b2b]"
          )}
        >
          {renderBrick(brick, rowHeight, breakpoint, mapOverrides)}
        </div>
      }
    />
  );
}

function renderBrick<T extends PageGridBrickType>(
  brick: PageGridBrick<T>,
  rowHeight: number,
  breakpoint: GridBreakpoint,
  mapOverrides?: MapControlsOverrides
) {
  const grid = brick.style[breakpoint].grid;

  return BRICK_RENDERERS[brick.type]({
    brick,
    rowHeight,
    breakpoint,
    grid,
    mapOverrides,
  });
}

type MapBrickContentProps = {
  brick: PageGridBrick<"map">;
  mapOverrides?: MapControlsOverrides;
};

function MapBrickContent({ brick, mapOverrides }: MapBrickContentProps) {
  const { updateMapBrick, isEditable } = usePageGridActions();
  const [captionDraft, setCaptionDraft] = useState(brick.data.caption ?? "");
  const captionDraftRef = useRef(captionDraft);
  const isEditingRef = useRef(false);
  const hasPendingChangeRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCaptionRef = useRef(normalizeMapCaption(brick.data.caption));

  useEffect(() => {
    if (isEditingRef.current || hasPendingChangeRef.current) {
      return;
    }

    const nextCaption = brick.data.caption ?? "";
    captionDraftRef.current = nextCaption;
    setCaptionDraft(nextCaption);
    lastSavedCaptionRef.current = normalizeMapCaption(brick.data.caption);
  }, [brick.data.caption]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const commitCaption = useCallback(
    (nextValue: string) => {
      if (!isEditable || !hasPendingChangeRef.current) {
        return;
      }

      const normalizedCaption = normalizeMapCaption(nextValue);
      if (normalizedCaption === lastSavedCaptionRef.current) {
        hasPendingChangeRef.current = false;
        return;
      }

      updateMapBrick({
        id: brick.id,
        data: { caption: normalizedCaption },
      });
      lastSavedCaptionRef.current = normalizedCaption;
      hasPendingChangeRef.current = false;
    },
    [brick.id, isEditable, updateMapBrick]
  );

  const scheduleCaptionSave = useCallback(
    (nextValue: string) => {
      if (!isEditable) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        commitCaption(nextValue);
      }, 650);
    },
    [commitCaption, isEditable]
  );

  const handleCaptionChange = useCallback(
    (value: string) => {
      if (!isEditable) {
        return;
      }

      captionDraftRef.current = value;
      setCaptionDraft(value);
      hasPendingChangeRef.current = true;
      scheduleCaptionSave(value);
    },
    [isEditable, scheduleCaptionSave]
  );

  const handleCaptionBlur = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    commitCaption(captionDraftRef.current);
    isEditingRef.current = false;
  }, [commitCaption]);

  const handleCaptionFocus = useCallback(() => {
    isEditingRef.current = true;
  }, []);

  const hasCoordinates = brick.data.lng !== null && brick.data.lat !== null;
  const center = hasCoordinates
    ? ([brick.data.lng, brick.data.lat] as [number, number])
    : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-muted/40">
      <MapCanvas
        center={mapOverrides?.center ?? center}
        zoom={brick.data.zoom ?? MAP_DEFAULT_ZOOM}
        controlsPanelOpen={mapOverrides?.controlsPanelOpen ?? false}
        showCenterIndicator
        showLocationLabel
        showGeolocateControl={false}
        locationLabel={captionDraft}
        locationLabelEditable={isEditable}
        onLocationLabelChange={handleCaptionChange}
        onLocationLabelBlur={handleCaptionBlur}
        onLocationLabelFocus={handleCaptionFocus}
        href={brick.data.href}
        onControlsChange={mapOverrides?.onControlsChange}
        onViewportChange={mapOverrides?.onViewportChange}
      />
    </div>
  );
}

function renderLinkBrick(brick: PageGridBrick<"link">, grid: GridSize) {
  return <LinkBrickContent brick={brick} grid={grid} />;
}

type LinkBrickContentProps = {
  brick: PageGridBrick<"link">;
  grid: GridSize;
};

function LinkBrickContent({ brick, grid }: LinkBrickContentProps) {
  const { updateLinkBrick, isEditable } = usePageGridActions();
  const viewModel = useMemo(
    () => buildLinkBrickViewModel(brick.data, grid),
    [brick.data, grid]
  );
  const isUploading = brick.status === "uploading";
  const titleClampClass = resolveTitleClampClass(viewModel.titleLines);

  const titleDraftRef = useRef(viewModel.title);
  const [titleDraft, setTitleDraft] = useState(viewModel.title);
  const isEditingRef = useRef(false);
  const hasPendingChangeRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTitleRef = useRef(normalizeLinkTitle(brick.data.title));

  useEffect(() => {
    if (isEditingRef.current || hasPendingChangeRef.current) {
      return;
    }

    titleDraftRef.current = viewModel.title;
    setTitleDraft(viewModel.title);
    lastSavedTitleRef.current = normalizeLinkTitle(brick.data.title);
  }, [brick.data.title, viewModel.title]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const commitTitle = useCallback(
    (nextValue: string) => {
      if (!isEditable || !hasPendingChangeRef.current) {
        return;
      }

      const normalizedTitle = normalizeLinkTitle(nextValue);
      if (normalizedTitle === lastSavedTitleRef.current) {
        hasPendingChangeRef.current = false;
        return;
      }

      updateLinkBrick({
        id: brick.id,
        data: { ...brick.data, title: normalizedTitle },
      });
      lastSavedTitleRef.current = normalizedTitle;
      hasPendingChangeRef.current = false;
    },
    [brick.data, brick.id, isEditable, updateLinkBrick]
  );

  const scheduleTitleSave = useCallback(
    (nextValue: string) => {
      if (!isEditable) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        commitTitle(nextValue);
      }, 650);
    },
    [commitTitle, isEditable]
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      titleDraftRef.current = value;
      setTitleDraft(value);
      hasPendingChangeRef.current = true;
      scheduleTitleSave(value);
    },
    [scheduleTitleSave]
  );

  const handleTitleBlur = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    commitTitle(titleDraftRef.current);
    isEditingRef.current = false;
  }, [commitTitle]);

  const handleTitleFocus = useCallback(() => {
    isEditingRef.current = true;
  }, []);

  const renderTitle = (extraClass?: string) => (
    <EditableParagraph
      value={titleDraft}
      onValueChange={handleTitleChange}
      onValueBlur={handleTitleBlur}
      onFocus={handleTitleFocus}
      readOnly={!isEditable}
      placeholder="Link title"
      ariaLabel="Link title"
      className={cn(
        "non-drag min-w-0 font-light text-foreground hover:bg-muted p-1 rounded-sm focus:bg-muted py-2",
        titleClampClass,
        extraClass
      )}
    />
  );

  const renderIcon = (iconSize?: string) => {
    return viewModel.showIcon ? (
      <a
        href={brick.data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-fit link-icon"
      >
        {viewModel.iconUrl ? (
          <img
            src={viewModel.iconUrl}
            alt=""
            className={cn(
              "size-7 shrink-0 rounded-lg object-cover xl:size-9",
              iconSize
            )}
          />
        ) : (
          <span className="size-5 shrink-0 rounded-lg flex items-center justify-center xl:size-6">
            <LinkSimpleIcon weight="bold" className="size-full" />
          </span>
        )}
      </a>
    ) : null;
  };

  const layoutElement = (layout: LinkBrickVariant) => {
    switch (layout) {
      case "compact":
        return (
          <div className="h-full flex items-center gap-4 min-w-0">
            {renderIcon()}
            {renderTitle("flex-1")}
          </div>
        );
      case "standard":
        return (
          <div className="h-full flex flex-col justify-between min-w-0">
            <div className="flex flex-col gap-2 min-w-0 xl:gap-4">
              {renderIcon()}
              {renderTitle("line-clamp-2 xl:line-clamp-3")}
            </div>
            <p className="text-muted-foreground text-xs">
              {viewModel.siteLabel}
            </p>
          </div>
        );
      case "wide":
        return (
          <div className="h-full flex flex-row justify-between gap-8 min-w-0">
            <div className="flex flex-col justify-between flex-3 min-w-0">
              <div className="flex flex-col gap-2 min-w-0 xl:gap-4">
                {renderIcon()}
                {renderTitle("line-clamp-2 xl:line-clamp-3")}
              </div>
              <p className="text-muted-foreground text-xs">
                {viewModel.siteLabel}
              </p>
            </div>

            <div className="shrink-0 flex-2 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
      case "tall":
        return (
          <div className="h-full flex flex-col justify-between gap-8 min-w-0">
            <div className="flex flex-col gap-4 flex-2 min-w-0">
              {renderIcon()}
              {renderTitle()}
            </div>
            <div className="shrink-0 flex-2 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
      case "rich":
        return (
          <div className="h-full flex flex-col justify-between gap-8 min-w-0">
            <div className="flex flex-col gap-4 flex-2 min-w-0">
              {renderIcon()}
              {renderTitle()}
            </div>
            <div className="shrink-0 flex-3 overflow-hidden rounded-lg">
              {viewModel.imageUrl ? (
                <img
                  src={viewModel.imageUrl}
                  alt={viewModel.siteLabel ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full box-border rounded-xl p-4 text-sm overflow-hidden",
        isUploading ? "bg-muted/60" : "bg-muted/30"
      )}
      aria-busy={isUploading}
    >
      {isUploading ? (
        <Skeleton className="absolute inset-0" />
      ) : (
        <div className="h-full">{layoutElement(viewModel.variant)}</div>
      )}
    </div>
  );
}

function renderMediaFrame(brick: PageGridBrick, content: ReactNode) {
  const isUploading = brick.status === "uploading";
  const linkUrl = resolveExternalHref(
    brick.type === "image" || brick.type === "video"
      ? (brick.data as BrickImageRow | BrickVideoRow).link_url
      : null
  );

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-3xl",
        isUploading ? "bg-muted/60" : "bg-muted/30"
      )}
      aria-busy={isUploading}
    >
      {isUploading ? <Skeleton className="absolute inset-0" /> : content}
      {linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-white rounded-full absolute top-3 left-3 size-6 shadow-[1px_2px_13px_4px_rgba(0,0,0,0.25)]"
        >
          <ArrowCircleUpRightIcon
            weight="fill"
            className="size-full text-black"
          />
        </a>
      )}
      {isUploading && <UploadOverlay />}
    </div>
  );
}

function UploadOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Spinner className="size-5" />
    </div>
  );
}

function resolveTitleClampClass(lines: number) {
  switch (lines) {
    case 1:
      return "line-clamp-1 truncate";
    case 3:
      return "line-clamp-3";
    case 5:
      return "line-clamp-5";
    default:
      return "";
  }
}

function normalizeLinkTitle(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMapCaption(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

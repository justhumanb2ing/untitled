import { type ReactNode } from "react";

import {
  MapCanvas,
  type MapCanvasControls,
  type MapCanvasViewport,
} from "@/components/map/map-canvas";
import { Item } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import PageGridTextBrick from "@/components/page/page-grid-text-brick";
import type { GridBreakpoint, GridSize } from "@/config/grid-rule";
import { cn } from "@/lib/utils";
import { resolveExternalHref } from "@/utils/resolve-external-href";
import { MAP_DEFAULT_ZOOM } from "../../utils/map";
import type {
  PageGridBrick,
  PageGridBrickType,
} from "../../../service/pages/page-grid";
import { ArrowCircleUpRightIcon } from "@phosphor-icons/react";
import type { BrickImageRow, BrickVideoRow } from "types/brick";
import { useLinkBrickState } from "./link-brick/use-link-brick-state";
import { LinkBrickView } from "./link-brick/link-brick-view";
import { usePageGridActions } from "./page-grid-context";
import { useEditableField } from "@/hooks/use-editable-field";

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

  const {
    value: caption,
    handleChange: handleCaptionChange,
    handleBlur: handleCaptionBlur,
    handleFocus: handleCaptionFocus,
  } = useEditableField({
    initialValue: brick.data.caption ?? "",
    onCommit: (nextValue) => {
      const normalizedCaption = normalizeMapCaption(nextValue);
      updateMapBrick({
        id: brick.id,
        data: { caption: normalizedCaption },
      });
    },
    normalize: normalizeMapCaption,
    isEditable,
  });

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
        locationLabel={caption}
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
  const {
    viewModel,
    title,
    titleClampClass,
    isUploading,
    isEditable,
    handleTitleChange,
    handleTitleBlur,
    handleTitleFocus,
  } = useLinkBrickState({ brick, grid });

  return (
    <LinkBrickView
      viewModel={viewModel}
      title={title}
      titleClampClass={titleClampClass}
      isUploading={isUploading}
      isEditable={isEditable}
      onTitleChange={handleTitleChange}
      onTitleBlur={handleTitleBlur}
      onTitleFocus={handleTitleFocus}
      linkUrl={brick.data.url}
    />
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


function normalizeMapCaption(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

import type { ReactNode } from "react";

import { Item } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import PageGridTextBrick from "@/components/page/page-grid-text-brick";
import type { GridBreakpoint } from "@/config/grid-rule";
import { cn } from "@/lib/utils";
import type {
  PageGridBrick,
  PageGridBrickType,
} from "../../../service/pages/page-grid";

type BrickRendererMap = {
  [K in PageGridBrickType]: (payload: {
    brick: PageGridBrick<K>;
    rowHeight: number;
    breakpoint: GridBreakpoint;
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
  link: ({ brick }) => (
    <div className="flex h-full w-full flex-col justify-center gap-1 rounded-3xl bg-muted/40 p-4 text-sm">
      <span className="font-medium text-foreground">
        {brick.data.title || brick.data.url || "Untitled link"}
      </span>
    </div>
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
}

export default function PageGridBrickItem({
  brick,
  rowHeight,
  breakpoint,
}: PageGridBrickItemProps) {
  return (
    <Item
      variant="muted"
      className="h-full w-full rounded-lg p-0"
      render={
        <div className="h-full w-full min-h-0 min-w-0 self-stretch">
          {renderBrick(brick, rowHeight, breakpoint)}
        </div>
      }
    />
  );
}

function renderBrick<T extends PageGridBrickType>(
  brick: PageGridBrick<T>,
  rowHeight: number,
  breakpoint: GridBreakpoint
) {
  return BRICK_RENDERERS[brick.type]({ brick, rowHeight, breakpoint });
}

function renderMediaFrame(brick: PageGridBrick, content: ReactNode) {
  const isUploading = brick.status === "uploading";

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-3xl",
        isUploading ? "bg-muted/60" : "bg-muted/30"
      )}
      aria-busy={isUploading}
    >
      {isUploading ? <Skeleton className="absolute inset-0" /> : content}
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

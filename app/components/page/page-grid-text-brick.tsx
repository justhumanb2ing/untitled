import { useCallback, useRef, type RefObject } from "react";

import EditableParagraph from "@/components/profile/editable-paragraph";
import { usePageGridActions } from "@/components/page/page-grid-context";
import { GRID_MARGIN, type GridBreakpoint } from "@/config/grid-rule";
import type { PageGridBrick } from "../../../service/pages/page-grid";
import { cn } from "@/lib/utils";
import { usePageGridTextBrickResize } from "./hooks/use-page-grid-text-brick-resize";
import { usePageGridTextBrickEditHandlers } from "./hooks/use-page-grid-text-brick-edit-handlers";
import { calculatePageGridTextRowSpan } from "./page-grid-text-brick-utils";

type PageGridTextBrickProps = {
  brick: PageGridBrick<"text">;
  rowHeight: number;
  breakpoint: GridBreakpoint;
};

export default function PageGridTextBrick({
  brick,
  rowHeight,
  breakpoint,
}: PageGridTextBrickProps) {
  const { updateTextBrick, updateTextBrickRowSpanLocal, isEditable } =
    usePageGridActions();
  const paragraphRef = useRef<HTMLParagraphElement | null>(null);

  const resolveRowSpan = useCallback(() => {
    return calculatePageGridTextRowSpan(
      paragraphRef.current,
      rowHeight,
      GRID_MARGIN["desktop"]![1]
    );
  }, [rowHeight]);

  const pushUpdate = useCallback(
    (text: string, isEditing: boolean, persist = true) => {
      updateTextBrick({
        id: brick.id,
        text,
        rowSpan: resolveRowSpan(),
        breakpoint,
        isEditing,
        persist,
      });
    },
    [brick.id, breakpoint, resolveRowSpan, updateTextBrick]
  );

  const { latestTextRef, handleValueChange, handleValueBlur } =
    usePageGridTextBrickEditHandlers(brick.data.text, pushUpdate);

  usePageGridTextBrickResize({
    paragraphRef: paragraphRef as RefObject<HTMLParagraphElement>,
    breakpoint,
    isEditable,
    brickId: brick.id,
    brickStatus: brick.status,
    latestTextRef,
    resolveRowSpan,
    pushUpdate,
    updateTextBrickRowSpanLocal,
  });

  return (
    <div className="flex w-full min-w-0 box-border items-center rounded-xl min-h-16! px-2 hover:shadow-[0px_6px_13px_-6px_rgba(0,0,0,0.1)] hover:border-[0.5px] transition-all duration-150 py-2">
      <EditableParagraph
        elementRef={paragraphRef as RefObject<HTMLParagraphElement>}
        value={brick.data.text}
        onValueChange={handleValueChange}
        onValueBlur={handleValueBlur}
        readOnly={!isEditable}
        placeholder="Write something..."
        multiline
        ariaLabel="Text block"
        className={cn(
          "non-drag",
          "min-w-48 w-fit max-w-full rounded-lg wrap-break-word break-all text-wrap box-border text-lg px-4 py-3.5 font-medium text-foreground transition-colors duration-300",
          "focus:bg-muted hover:bg-muted",
          "data-[empty=true]:max-w-full",
          "data-[empty=true]:before:top-3.5 data-[empty=true]:before:left-5",
          "xl:py-2.5 xl:data-[empty=true]:before:top-2.5"
        )}
        style={{ minHeight: 0 }}
      />
    </div>
  );
}

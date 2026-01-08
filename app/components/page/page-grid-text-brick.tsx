import { useCallback, useEffect, useRef, type RefObject } from "react";

import EditableParagraph from "@/components/profile/editable-paragraph";
import { usePageGridActions } from "@/components/page/page-grid-context";
import { GRID_MARGIN, type GridBreakpoint } from "@/config/grid-rule";
import type { PageGridBrick } from "../../../service/pages/page-grid";
import { cn } from "@/lib/utils";

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
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const latestTextRef = useRef(brick.data.text);

  useEffect(() => {
    latestTextRef.current = brick.data.text;
  }, [brick.data.text]);

  const resolveRowSpan = useCallback(() => {
    const element = paragraphRef.current;
    if (!element || rowHeight <= 0) {
      return 1;
    }

    const scrollHeight = element.scrollHeight;
    const computed = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(computed.lineHeight);
    const paddingTop = Number.parseFloat(computed.paddingTop);
    const paddingBottom = Number.parseFloat(computed.paddingBottom);
    const singleLineHeight = Number.isFinite(lineHeight)
      ? lineHeight + paddingTop + paddingBottom
      : scrollHeight;
    const targetHeight = Math.max(scrollHeight, singleLineHeight);

    if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
      return 1;
    }

    const marginY = GRID_MARGIN["desktop"]![1];
    const rawSpan = (targetHeight + marginY) / (rowHeight + marginY);
    return Number(rawSpan.toFixed(2));
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

  const handleValueChange = useCallback(
    (value: string) => {
      latestTextRef.current = value;
      pushUpdate(value, true);
    },
    [pushUpdate]
  );

  const handleValueBlur = useCallback(() => {
    pushUpdate(latestTextRef.current, false);
  }, [pushUpdate]);

  useEffect(() => {
    const element = paragraphRef.current;
    if (!element) {
      return;
    }

    const handleResize = () => {
      if (!isEditable && breakpoint === "mobile") {
        updateTextBrickRowSpanLocal({
          id: brick.id,
          rowSpan: resolveRowSpan(),
          breakpoint,
        });
        return;
      }

      if (!isEditable) {
        return;
      }

      const isEditing = brick.status === "editing";
      pushUpdate(latestTextRef.current, isEditing, isEditing);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [
    brick.id,
    brick.status,
    breakpoint,
    isEditable,
    pushUpdate,
    resolveRowSpan,
    updateTextBrickRowSpanLocal,
  ]);

  return (
    <div className="flex h-full w-full min-w-0 box-border items-start rounded-lg">
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
          "editable-paragraph",
          "min-w-48 w-fit max-w-full rounded-lg wrap-break-word break-all text-wrap box-border text-lg px-4 py-3.5 font-medium text-foreground transition-colors duration-300",
          "hover:bg-muted",
          "data-[empty=true]:max-w-full",
          "data-[empty=true]:before:top-3.5 data-[empty=true]:before:left-5",
          "xl:py-2.5 xl:data-[empty=true]:before:top-2.5"
        )}
        style={{ minHeight: 0 }}
      />
    </div>
  );
}

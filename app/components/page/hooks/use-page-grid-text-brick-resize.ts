import { useEffect, type RefObject } from "react";

import type { GridBreakpoint } from "@/config/grid-rule";

type UpdateRowSpanLocalParams = {
  id: string;
  rowSpan: number;
  breakpoint: GridBreakpoint;
};

type Options = {
  paragraphRef: RefObject<HTMLParagraphElement>;
  breakpoint: GridBreakpoint;
  isEditable: boolean;
  brickId: string;
  brickStatus: string;
  latestTextRef: RefObject<string>;
  resolveRowSpan: () => number;
  pushUpdate: (text: string, isEditing: boolean, persist?: boolean) => void;
  updateTextBrickRowSpanLocal: (params: UpdateRowSpanLocalParams) => void;
};

export function usePageGridTextBrickResize({
  paragraphRef,
  breakpoint,
  isEditable,
  brickId,
  brickStatus,
  latestTextRef,
  resolveRowSpan,
  pushUpdate,
  updateTextBrickRowSpanLocal,
}: Options) {
  useEffect(() => {
    const element = paragraphRef.current;
    if (!element) {
      return;
    }

    const handleResize = () => {
      if (!isEditable && breakpoint === "mobile") {
        updateTextBrickRowSpanLocal({
          id: brickId,
          rowSpan: resolveRowSpan(),
          breakpoint,
        });
        return;
      }

      if (!isEditable) {
        return;
      }

      const isEditing = brickStatus === "editing";
      pushUpdate(latestTextRef.current, isEditing, isEditing);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [
    breakpoint,
    brickId,
    brickStatus,
    isEditable,
    latestTextRef,
    paragraphRef,
    pushUpdate,
    resolveRowSpan,
    updateTextBrickRowSpanLocal,
  ]);
}

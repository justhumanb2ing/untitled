import type { MouseEvent } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export type ResizeOption = { w: number; h: number; label?: string };

export const SIZE_OPTIONS: ResizeOption[] = [
  { w: 1, h: 2, label: "1x1" },
  { w: 2, h: 2, label: "1x2" },
  { w: 1, h: 4, label: "2x1" },
  { w: 2, h: 4, label: "2x2" },
];

type Props = {
  currentSize?: ResizeOption;
  onSelect?: (size: ResizeOption) => void;
};

export default function BlockResizeController({
  currentSize,
  onSelect,
}: Props) {
  const handleClick = (
    event: MouseEvent<HTMLButtonElement>,
    size: ResizeOption
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(size);
  };

  return (
    <>
      {SIZE_OPTIONS.map((size) => {
        const isActive = currentSize?.w === size.w && currentSize?.h === size.h;

        return (
          <Button
            type="button"
            key={size.label}
            size={"icon-lg"}
            variant={"ghost"}
            title={size.label}
            aria-pressed={isActive}
            onClick={(event) => handleClick(event, size)}
            className={cn(
              "group relative flex flex-row items-center justify-center p-0.5 rounded-lg transition-all",
              isActive
                ? "bg-brand text-background shadow-sm hover:bg-brand"
                : "hover:bg-white/10"
            )}
          >
            <div className="grid grid-cols-[6px_6px] grid-rows-[6px_6px]">
              <div
                className={`w-[5px] h-[5px] rounded-[1px] ${
                  size.w >= 1 && size.h >= 2 ? "bg-white" : "bg-white/20"
                }`}
              />
              <div
                className={`w-[5px] h-[5px] rounded-[1px] ${
                  size.w >= 2 && size.h >= 2 ? "bg-white" : "bg-white/20"
                }`}
              />
              <div
                className={`w-[5px] h-[5px] rounded-[1px] ${
                  size.w >= 1 && size.h >= 4 ? "bg-white" : "bg-white/20"
                }`}
              />
              <div
                className={`w-[5px] h-[5px] rounded-[1px] ${
                  size.w >= 2 && size.h >= 4 ? "bg-white" : "bg-white/20"
                }`}
              />
            </div>
          </Button>
        );
      })}
    </>
  );
}

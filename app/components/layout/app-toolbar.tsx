import { useRef, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import {
  ToolbarButton,
  ToolbarGroup,
  Toolbar as ToolbarRoot,
} from "../ui/toolbar";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { toastManager } from "@/components/ui/toast";
import { usePageGridActions } from "@/components/page/page-grid-context";
import { getMediaValidationError } from "../../../service/pages/page-grid";

type Props = {};

export default function AppToolbar({}: Props) {
  const { addMediaFile, addTextBrick, addMapBrick, isEditable } =
    usePageGridActions();
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaClick = () => {
    if (!isEditable) {
      return;
    }
    mediaInputRef.current?.click();
  };

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const errorMessage = getMediaValidationError(file);
    if (errorMessage) {
      toastManager.add({
        type: "error",
        title: "Upload blocked",
        description: errorMessage,
      });
      return;
    }

    addMediaFile(file);
  };

  const handleTextClick = () => {
    if (!isEditable) {
      return;
    }

    addTextBrick();
  };

  const handleMapClick = () => {
    if (!isEditable) {
      return;
    }

    addMapBrick();
  };

  if (!isEditable) {
    return null;
  }
  
  return (
    <aside className={cn("fixed bottom-10 left-1/2 -translate-x-1/2")}>
      <ToolbarRoot className={"toolbar-shadow border-0 px-3 py-2"}>
        <ToolbarGroup className={"gap-2"}>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <Button
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-8 p-1"}
                      type="button"
                    >
                      <img
                        src="/link.svg"
                        alt="link"
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="top" sideOffset={8}>
              <p>Link</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <Button
                      type="button"
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-8 p-1"}
                      onClick={handleTextClick}
                      disabled={!isEditable}
                      aria-disabled={!isEditable}
                    >
                      <img
                        src="/note.svg"
                        alt="text"
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="top" sideOffset={8}>
              <p>Text</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <Button
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-8 p-1"}
                      type="button"
                      onClick={handleMediaClick}
                      disabled={!isEditable}
                      aria-disabled={!isEditable}
                    >
                      <img
                        src="/photo.svg"
                        alt="image&video"
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="top" sideOffset={8}>
              <p>Image &amp; Video</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <Button
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-8 p-1"}
                      type="button"
                      onClick={handleMapClick}
                      disabled={!isEditable}
                      aria-disabled={!isEditable}
                    >
                      <img
                        src="/map.svg"
                        alt="map"
                        className="w-full h-full object-cover"
                      />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="top" sideOffset={8}>
              <p>Map</p>
            </TooltipContent>
          </Tooltip>
        </ToolbarGroup>
      </ToolbarRoot>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={handleMediaChange}
        disabled={!isEditable}
        aria-disabled={!isEditable}
      />
    </aside>
  );
}

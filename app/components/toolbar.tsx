import { cn } from "@/lib/utils";
import {
  ToolbarButton,
  ToolbarGroup,
  Toolbar as ToolbarRoot,
} from "./ui/toolbar";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  ArticleNyTimesIcon,
  LinkIcon,
  MapPinAreaIcon,
  VideoIcon,
} from "@phosphor-icons/react";

type Props = {};

export default function Toolbar({}: Props) {
  return (
    <aside className={cn("fixed bottom-10 left-1/2 -translate-x-1/2")}>
      <ToolbarRoot className={"shadow-sm rounded-xl"}>
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger
              render={
                <ToolbarButton
                  render={
                    <Button
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-10"}
                    >
                      {/* <img
                        src="/link-icon.png"
                        alt="link"
                        className="w-full h-full object-cover scale-150"
                      /> */}
                      <LinkIcon weight="bold" className="size-6" />
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
                      size={"icon-lg"}
                      variant={"ghost"}
                      className={"size-10"}
                    >
                      {/* <img
                        src="/text-icon.png"
                        alt="text"
                        className="w-full h-full object-cover scale-150"
                      /> */}
                      <ArticleNyTimesIcon weight="bold" className="size-6" />
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
                      className={"size-10"}
                    >
                      {/* <img
                        src="/image-video-icon.png"
                        alt="image&video"
                        className="w-full h-full object-cover scale-150"
                      /> */}
                      <VideoIcon weight="fill" className="size-6" />
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
                      className={"size-10"}
                    >
                      {/* <img
                        src="/map-icon.png"
                        alt="map"
                        className="w-full h-full object-cover scale-150"
                      /> */}
                      <MapPinAreaIcon weight="fill" className="size-6" />
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
    </aside>
  );
}

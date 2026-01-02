import { DesktopIcon, DeviceMobileCameraIcon } from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface LayoutToggleProps {
  isDesktop: boolean;
  onToggle: (isDesktop: boolean) => void;
}

const DESKTOP_VALUE = "desktop";
const MOBILE_VALUE = "mobile";

export default function LayoutToggle({
  isDesktop,
  onToggle,
}: LayoutToggleProps) {
  const currentValue = isDesktop ? DESKTOP_VALUE : MOBILE_VALUE;

  return (
    <ToggleGroup
      defaultValue={[currentValue]}
      onValueChange={(nextValue) => {
        if (nextValue.includes(DESKTOP_VALUE)) {
          onToggle(true);
          return;
        }

        if (nextValue.includes(MOBILE_VALUE)) {
          onToggle(false);
        }
      }}
      aria-label="Layout width"
      size={"lg"}
      spacing={2}
      className={
        "rounded-xl fixed bottom-4 right-4 bg-background/40 p-1 shadow-sm backdrop-blur-sm z-50 hidden sm:block"
      }
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                value={DESKTOP_VALUE}
                aria-label="Desktop width"
                disabled={isDesktop}
                className="p-5 rounded-lg aria-pressed:bg-foreground aria-pressed:text-background disabled:bg-transparent disabled:opacity-100 disabled:cursor-not-allowed"
              >
                <DesktopIcon weight="bold" className="size-6" />
              </ToggleGroupItem>
            }
          />
          <TooltipContent>Desktop layout</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                value={MOBILE_VALUE}
                aria-label="Mobile width"
                disabled={!isDesktop}
                className="p-5 rounded-lg aria-pressed:bg-foreground aria-pressed:text-background disabled:bg-transparent disabled:opacity-100 disabled:cursor-not-allowed"
              >
                <DeviceMobileCameraIcon weight="bold" className="size-6" />
              </ToggleGroupItem>
            }
          />
          <TooltipContent>Mobile layout</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </ToggleGroup>
  );
}

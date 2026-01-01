import { DesktopIcon, DeviceMobileCameraIcon } from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

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
      className={"rounded-xl fixed bottom-4 right-4 bg-muted/40 p-1 shadow-sm backdrop-blur-sm"}
    >
      <ToggleGroupItem
        value={DESKTOP_VALUE}
        aria-label="Desktop width"
        className="p-5 rounded-lg aria-pressed:bg-black aria-pressed:text-white"
      >
        <DesktopIcon weight="bold" className="size-6" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value={MOBILE_VALUE}
        aria-label="Mobile width"
        className="p-5 rounded-lg aria-pressed:bg-black aria-pressed:text-white"
      >
        <DeviceMobileCameraIcon weight="bold" className="size-6" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

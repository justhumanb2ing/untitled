import { ChartBarIcon, GearSixIcon } from "@phosphor-icons/react";
import { useIntlayer, useLocale } from "react-intlayer";
import { NavLink, useParams } from "react-router";
import ChangeHandleFormPopover from "./change-handle-form-popover";
import { locacalizeTo } from "./localized-link";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import UserAuthButton from "./user-auth-button";
import { OwnerGate } from "./owner-gate";
import { Separator } from "./ui/separator";
import LocaleSwitcher from "./locale-switcher";

interface BottomActionBarProps {
  isOwner: boolean;
}

export default function BottomActionBar({ isOwner }: BottomActionBarProps) {
  const { handle } = useParams();
  const { locale } = useLocale();
  const { analyticsComingSoon, settingsLabel } = useIntlayer("bottomActionBar");
  const settingPath = handle ? `/user/${handle}/setting` : "/";
  const settingTo = locacalizeTo(settingPath, locale);

  return (
    <div className="flex items-center gap-1">
      {/* Analytics Link Button */}
      <OwnerGate isOwner={isOwner}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant={"ghost"} size={"icon-lg"}>
                <ChartBarIcon weight="regular" className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="bottom" sideOffset={8}>
            <p>{analyticsComingSoon.value}</p>
          </TooltipContent>
        </Tooltip>
      </OwnerGate>

      {/* Change Handle Button */}
      <OwnerGate isOwner={isOwner}>
        <ChangeHandleFormPopover handle={handle} />
      </OwnerGate>

      {/* Setting Link Button */}
      <OwnerGate isOwner={isOwner}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={"ghost"}
                size={"icon-lg"}
                render={
                  <NavLink prefetch="viewport" to={settingTo} end>
                    {({ isActive }) => (
                      <GearSixIcon
                        weight={isActive ? "fill" : "regular"}
                        className="size-4"
                      />
                    )}
                  </NavLink>
                }
              />
            }
          />
          <TooltipContent side="bottom" sideOffset={8}>
            <p>{settingsLabel.value}</p>
          </TooltipContent>
        </Tooltip>
      </OwnerGate>

      <ThemeToggle iconSize="size-4" />

      <Separator orientation="vertical" className={"my-1.5"} />
      <LocaleSwitcher />
      <UserAuthButton />
    </div>
  );
}

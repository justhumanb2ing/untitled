import { ChartBarIcon, GearSixIcon, HouseSimpleIcon } from "@phosphor-icons/react";
import { useLocale } from "react-intlayer";
import { NavLink, useParams } from "react-router";
import ChangeHandleFormPopover from "./change-handle-form-popover";
import { locacalizeTo } from "./localized-link";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function BottomActionBar() {
  const { handle } = useParams();
  const { locale } = useLocale();
  const settingPath = handle ? `/user/${handle}/setting` : "/";
  const homePath = handle ? `/user/${handle}` : "/";
  const homeTo = locacalizeTo(homePath, locale);
  const settingTo = locacalizeTo(settingPath, locale);

  return (
    <div className="bg-muted/80 backdrop-blur-sm rounded-3xl p-1 flex items-center justify-between px-2 gap-1">
      {/* Home Link Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={"ghost"}
              size={"icon-lg"}
              className={"p-6 rounded-2xl"}
              render={
                <NavLink to={homeTo} end>
                  {({ isActive }) => (
                    <HouseSimpleIcon
                      weight={isActive ? "fill" : "regular"}
                      className="size-6"
                    />
                  )}
                </NavLink>
              }
            />
          }
        />
        <TooltipContent side="bottom" sideOffset={8}>
          <p>Home</p>
        </TooltipContent>
      </Tooltip>

      {/* Analytics Link Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={"ghost"}
              size={"icon-lg"}
              className={"p-6 rounded-2xl"}
            >
              <ChartBarIcon weight="regular" className="size-6" />
            </Button>
          }
        />
        <TooltipContent side="bottom" sideOffset={8}>
          <p>Analytics (Comming Soon!)</p>
        </TooltipContent>
      </Tooltip>
      <ChangeHandleFormPopover handle={handle} />

      {/* Setting Link Button */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={"ghost"}
              size={"icon-lg"}
              className={"p-6 rounded-2xl"}
              render={
                <NavLink to={settingTo} end>
                  {({ isActive }) => (
                    <GearSixIcon
                      weight={isActive ? "fill" : "regular"}
                      className="size-6"
                    />
                  )}
                </NavLink>
              }
            />
          }
        />
        <TooltipContent side="bottom" sideOffset={8}>
          <p>Setting</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

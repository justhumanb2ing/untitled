import { SignOutButton, useUser } from "@clerk/react-router";
import { useLocation } from "react-router";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function LogoutButton() {
  const { isSignedIn } = useUser();
  const location = useLocation();

  if (!isSignedIn) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SignOutButton
            redirectUrl={`${location.pathname}${location.search}${location.hash}`}
          >
            <Button
              variant={"ghost"}
              size={"lg"}
              className={"text-sm text-muted-foreground"}
            >
              Sign out
            </Button>
          </SignOutButton>
        }
      />
      <TooltipContent side="bottom" sideOffset={8}>
        Sign out
      </TooltipContent>
    </Tooltip>
  );
}

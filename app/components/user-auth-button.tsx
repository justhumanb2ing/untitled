import { SignInButton, SignOutButton, useUser } from "@clerk/react-router";
import { useLocation } from "react-router";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Spinner } from "./ui/spinner";

export default function UserAuthButton() {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();

  if (!isLoaded) return <Spinner />;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          isSignedIn ? (
            <SignOutButton
              redirectUrl={`${location.pathname}${location.search}${location.hash}`}
            >
              <Button
                variant={"ghost"}
                size={"lg"}
                className={"text-xs text-muted-foreground"}
              >
                Sign out
              </Button>
            </SignOutButton>
          ) : (
            <SignInButton
              forceRedirectUrl={`${location.pathname}${location.search}${location.hash}`}
            >
              <Button
                variant={"ghost"}
                size={"lg"}
                className={"text-xs text-muted-foreground"}
              >
                Sign in
              </Button>
            </SignInButton>
          )
        }
      />
      <TooltipContent side="bottom" sideOffset={8}>
        {isSignedIn ? "Sign out" : "Sign in"}
      </TooltipContent>
    </Tooltip>
  );
}

import { SignInButton, SignOutButton, useUser } from "@clerk/react-router";
import { useIntlayer } from "react-intlayer";
import { useLocation } from "react-router";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Spinner } from "./ui/spinner";

export default function UserAuthButton() {
  const { isSignedIn, isLoaded } = useUser();
  const location = useLocation();
  const { signInLabel, signOutLabel } = useIntlayer("userAuthButton");

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
                {signOutLabel.value}
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
                {signInLabel.value}
              </Button>
            </SignInButton>
          )
        }
      />
      <TooltipContent side="bottom" sideOffset={8}>
        {isSignedIn ? signOutLabel.value : signInLabel.value}
      </TooltipContent>
    </Tooltip>
  );
}

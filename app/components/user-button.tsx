import { LocalizedLink } from "@/components/localized-link";
import { Button } from "./ui/button";
import { useUser } from "@clerk/react-router";
import { Spinner } from "./ui/spinner";
import * as amplitude from "@amplitude/analytics-browser";

interface UserButtonProps {
  primaryHandle: string | null;
}

export default function UserButton({ primaryHandle }: UserButtonProps) {
  const { user, isLoaded } = useUser();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  if (!isLoaded) return <Spinner />;

  return (
    <Button
      variant={"secondary"}
      size={"lg"}
      className="gap-0 rounded-full py-0 ps-0 pe-3 h-10 px-5"
      onClick={() => {
        amplitude.track("User Button");
      }}
      render={
        primaryHandle ? (
          <LocalizedLink prefetch="viewport" to={`/user/${primaryHandle}`} />
        ) : undefined
      }
    >
      <div className="me-1.5 flex aspect-square h-full p-1.5 relative">
        <img
          alt="Profile image"
          aria-hidden="true"
          className="h-auto w-full rounded-full"
          height={32}
          src={user?.imageUrl}
          width={32}
        />
      </div>
      <span>{name}</span>
    </Button>
  );
}

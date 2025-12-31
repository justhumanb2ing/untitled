import BottomActionBar from "@/components/bottom-action-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useParams } from "react-router";

export default function UserProfileRoute() {
  const { handle } = useParams();

  return (
    <div>
      Current User handle: {handle}
      <BottomActionBar />
      <ThemeToggle />
    </div>
  );
}

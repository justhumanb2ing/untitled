import { useParams } from "react-router";

export default function UserProfileRoute() {
  const { handle } = useParams();

  return <div>Current User handle: {handle}</div>;
}

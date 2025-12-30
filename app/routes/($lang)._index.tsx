import LocaleSwitcher from "@/components/locale-switcher";
import type { Route } from "./+types/($lang)._index";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div>
      <nav>
        <LocaleSwitcher />
        <Link to={"/test"}>Test Route</Link>
      </nav>
    </div>
  );
}

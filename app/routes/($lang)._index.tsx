import LocaleSwitcher from "@/components/locale-switcher";
import type { Route } from "./+types/($lang)._index";

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
      </nav>
    </div>
  );
}

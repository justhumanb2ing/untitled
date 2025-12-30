import { CoverExample } from "@/components/preview";
import type { Route } from "./+types/($lang)._index";
import LocaleSwitcher from "@/components/locale-switcher";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div>
      <div>
        <nav>
          <LocaleSwitcher />
        </nav>
      </div>
      <CoverExample />
    </div>
  );
}

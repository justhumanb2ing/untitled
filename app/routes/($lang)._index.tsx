import LocaleSwitcher from "@/components/locale-switcher";
import type { Route } from "./+types/($lang)._index";
import { ThemeToggle } from "@/components/theme-toggle";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div>
      <header>
        <nav className="flex items-center justify-end gap-4">
          <ThemeToggle className="rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50" />
          <LocaleSwitcher />
        </nav>
      </header>
    </div>
  );
}

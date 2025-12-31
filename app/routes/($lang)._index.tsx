import LocaleSwitcher from "@/components/locale-switcher";
import type { Route } from "./+types/($lang)._index";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <main>
      <header className="flex items-center justify-end mx-auto max-w-7xl py-4 gap-2 px-4">
        <SignedOut>
          <Button render={<SignInButton />} />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <Separator orientation="vertical" />
        <nav className="flex items-center justify-end gap-2">
          <ThemeToggle className="rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50" />
          <LocaleSwitcher />
        </nav>
      </header>
    </main>
  );
}

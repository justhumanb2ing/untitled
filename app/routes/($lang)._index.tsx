import LocaleSwitcher from "@/components/locale-switcher";
import type { Route } from "./+types/($lang)._index";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignedIn, SignedOut, SignInButton } from "@clerk/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import UserButton from "@/components/user-button";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);

  if (!userId) return { primaryHandle: null };

  const supabase = await getSupabaseServerClient(args);

  const { data, error } = await supabase
    .from("pages")
    .select("handle")
    .eq("owner_id", userId!)
    .eq("is_primary", true)
    .maybeSingle();

  if (error || !data?.handle) {
    return { primaryHandle: null };
  }

  return { primaryHandle: data.handle };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { primaryHandle } = loaderData;

  return (
    <main>
      <header className="flex items-center justify-end mx-auto max-w-7xl py-4 gap-2 px-2">
        <SignedOut>
          <Button render={<SignInButton />} />
        </SignedOut>
        <SignedIn>
          <UserButton primaryHandle={primaryHandle} />
        </SignedIn>
        <Separator orientation="vertical" />
        <nav className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </nav>
      </header>
    </main>
  );
}

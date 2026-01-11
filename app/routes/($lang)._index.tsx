import LocaleSwitcher from "@/components/i18n/locale-switcher";
import type { Route } from "./+types/($lang)._index";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SignedIn, SignedOut, SignInButton } from "@clerk/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import UserButton from "@/components/account/user-button";
import { useIntlayer } from "react-intlayer";
import { useUmamiPageView } from "@/hooks/use-umami-page-view";
import { getUmamiEventAttributes } from "@/lib/analytics/umami";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/analytics/umami-events";

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
  const { startForFree } = useIntlayer("home");

  useUmamiPageView({
    eventName: UMAMI_EVENTS.page.homeView,
    props: {
      [UMAMI_PROP_KEYS.ctx.pageKind]: "home",
    },
  });

  return (
    <main>
      <header className="flex items-center justify-end mx-auto max-w-7xl py-4 gap-2 px-2">
        <SignedOut>
          <SignInButton>
            <Button
              variant={"brand"}
              size={"lg"}
              className={"rounded-xl h-10 px-4 text-sm"}
              {...getUmamiEventAttributes(UMAMI_EVENTS.auth.signIn.start, {
                [UMAMI_PROP_KEYS.ctx.source]: "home_cta",
              })}
            >
              {startForFree.value}
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton primaryHandle={primaryHandle} />
        </SignedIn>
        <Separator
          orientation="vertical"
          className={
            "my-1.5 rounded-full data-[orientation=vertical]:bg-muted data-[orientation=vertical]:w-0.5"
          }
        />
        <nav className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <LocaleSwitcher />
        </nav>
      </header>
    </main>
  );
}

import LocaleSwitcher from "@/components/i18n/locale-switcher";
import type { Route } from "./+types/($lang)._index";
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
import { Link } from "react-router";
import Logo from "@/components/layout/logo";

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
      {/* Header */}
      <header className="flex items-center justify-between gap-1 mx-auto max-w-7xl py-4 px-4">
        <Logo />
        <aside className="flex items-center gap-1">
          <SignedOut>
            <SignInButton>
              <Button
                variant={"brand"}
                size={"lg"}
                className={"text-sm md:rounded-xl md:h-10 md:px-4"}
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
            <LocaleSwitcher />
          </nav>
        </aside>
      </header>

      {/* Landing Page Main Section */}
      <section className="h-dvh flex flex-col justify-center items-center gap-4 from-muted/50 to-background bg-linear-to-b from-30% text-muted-foreground text-sm">
        Landing Section
      </section>

      {/* Footer */}
      <footer className="h-[400px] my-20 text-muted-foreground flex flex-col justify-center items-center gap-20">
        <div>
          <div className="flex justify-center font-medium text-3xl tracking-tighter">
            beyondthewave
          </div>
          <div className="text-sm text-center">Designed by Justhumanbeing</div>
        </div>
        <div>
          <ul className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <li className="hover:underline underline-offset-2">
              <Link to={"/sign-in"}>Sign In</Link>
            </li>
            <li className="hover:underline underline-offset-2">
              <Link to={"/changelog"}>Changelog</Link>
            </li>
            <li className="hover:underline underline-offset-2">
              <Link to={"/issue"}>Issue</Link>
            </li>
          </ul>
        </div>
        <div>
          <a
            href="https://www.buymeacoffee.com/justhumanb2ing"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=justhumanb2ing&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff" />
          </a>
        </div>
      </footer>
    </main>
  );
}

import { Button } from "@/components/ui/button";
import { SignIn } from "@clerk/react-router";
import { XIcon } from "@phosphor-icons/react";
import { useNavigate, useParams } from "react-router";
import { useUmamiPageView } from "@/hooks/use-umami-page-view";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/analytics/umami-events";
import type { Route } from "./+types/($lang)._auth.sign-in";
import { buildMeta } from "@/lib/metadata";

export function meta({ location }: Route.MetaArgs) {
  return buildMeta({
    title: "Sign in",
    description: "Access your account and manage your page.",
    path: location.pathname,
  });
}

export default function SignInRoute() {
  const { lang } = useParams();
  const signInPath = lang ? `/${lang}/sign-in` : "/sign-in";
  const signUpUrl = lang ? `/${lang}/sign-up` : "/sign-up";
  const navigate = useNavigate();

  useUmamiPageView({
    eventName: UMAMI_EVENTS.page.signInView,
    props: {
      [UMAMI_PROP_KEYS.ctx.pageKind]: "sign_in",
    },
  });

  return (
    <main className="grow flex flex-col justify-center h-full relative">
      <header className="fixed top-5 left-5">
        <Button
          variant={"ghost"}
          size={"icon-lg"}
          className={"rounded-full p-6"}
          onClick={() => navigate(-1)}
        >
          <XIcon className="size-6" weight="bold" />
        </Button>
      </header>
      <section className="w-full flex items-center h-full justify-center">
        <div className="lg:flex-5 flex justify-center">
          <SignIn path={signInPath} signUpUrl={signUpUrl} withSignUp />
        </div>

        <aside className="h-full flex-5 hidden lg:block">
          <div className="relative h-full">
            {/* <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-linear-to-r from-black/60 to-transparent"
            /> */}
            <img
              src="https://images.unsplash.com/photo-1766963031469-0f52e1ab417a?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="sign-in-page"
              className="w-full max-h-screen min-h-full object-cover"
            />
          </div>
        </aside>
      </section>
    </main>
  );
}

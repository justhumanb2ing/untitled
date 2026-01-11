import Logo from "@/components/layout/logo";
import type { Route } from "./+types/($lang).issue";
import { buildMeta } from "@/lib/metadata";

export function meta({ location }: Route.MetaArgs) {
  return buildMeta({
    title: "Issue",
    description: "Report an issue or share product feedback.",
    path: location.pathname,
  });
}

export default function IssueRoute() {
  return (
    <main className="h-full container mx-auto max-w-2xl flex flex-col gap-6 p-8">
      <header>
        <Logo />
      </header>
      <section className="grow rounded-lg flex flex-col justify-center items-center">
        <p className="text-sm/relaxed text-muted-foreground ">
          Report an issue (coming soon)
        </p>
      </section>
    </main>
  );
}

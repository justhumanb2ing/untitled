import { useState } from "react";
import BottomActionBar from "@/components/bottom-action-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Route } from "./+types/($lang)._auth.user.$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { LightningIcon, SealCheckIcon } from "@phosphor-icons/react";
import VisibilityToggle from "@/components/visibility-toggle";
import { OwnerGate } from "@/components/owner-gate";
import UserAuthButton from "@/components/user-auth-button";
import ProfileHeaderEditor from "@/components/profile-header-editor";
import { cn } from "@/lib/utils";
import LayoutToggle from "@/components/layout-toggle";
import { NumberTicker } from "@/components/effects/number-ticker";
import { Separator } from "@/components/ui/separator";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  const { handle } = args.params;

  if (!handle) {
    throw new Response("Not Found", { status: 404 });
  }

  const supabase = await getSupabaseServerClient(args);
  const pageSelectQuery =
    "id, owner_id, handle, title, description, image_url, is_public, is_primary";

  const { data: page, error } = await supabase
    .from("pages")
    .select(pageSelectQuery)
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    throw new Response(error.message, { status: 500 });
  }

  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  const isOwner = page.owner_id === userId;
  if (!page.is_public && !isOwner)
    throw new Response("Not Found", { status: 404 });

  return { page, handle, isOwner };
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  const { page, handle, isOwner } = loaderData;
  const [isDesktop, setIsDesktop] = useState(true);

  return (
    <div
      className={cn(
        `flex flex-col gap-4 transition-all ease-in-out duration-500 pt-4 bg-background relative`,
        isDesktop
          ? "max-w-full w-full h-full"
          : "self-start max-w-lg border rounded-4xl shadow-lg mx-auto container my-6 min-h-[calc(100dvh-3rem)]"
      )}
    >
      <header className="flex justify-between items-center gap-1 bg-muted/50 rounded-lg p-2 backdrop-blur-md sticky top-3 mx-4 px-4 z-10">
        <aside className="font-semibold flex items-center gap-1">
          <SealCheckIcon className="fill-blue-500 size-5" weight="fill" />
          {handle}
        </aside>
        <div className="flex items-center gap-4">
          <OwnerGate isOwner={isOwner}>
            <VisibilityToggle pageId={page.id} isPublic={page.is_public} />
          </OwnerGate>
          <Separator orientation="vertical" className={"my-1"} />
          <p className="text-xs ">
            <NumberTicker value={187} /> View
          </p>
        </div>
      </header>

      <div className="max-w-2xl p-6">
        <ProfileHeaderEditor
          imageUrl={page.image_url}
          title={page.title}
          description={page.description}
          handle={handle}
          isOwner={isOwner}
        />
      </div>

      <section className="p-10 py-6 grow">Page Layout Section</section>

      <OwnerGate isOwner={isOwner}>
        <BottomActionBar />
      </OwnerGate>

      <LayoutToggle isDesktop={isDesktop} onToggle={setIsDesktop} />

      <footer
        className={cn(
          "text-sm text-muted-foreground relative flex items-center gap-1 h-40 px-8",
          !isDesktop && "flex-col justify-center"
        )}
      >
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserAuthButton />
        </div>
        <p
          className={cn(
            "flex items-center gap-1",
            isDesktop
              ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              : "relative"
          )}
        >
          <LightningIcon weight="fill" />
          Powered by Untitled
        </p>
      </footer>
    </div>
  );
}

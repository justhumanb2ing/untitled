import BottomActionBar from "@/components/bottom-action-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Route } from "./+types/($lang)._auth.user.$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SealCheckIcon } from "@phosphor-icons/react";
import VisibilityToggle from "@/components/visibility-toggle";
import { OwnerGate } from "@/components/owner-gate";
import LogoutButton from "@/components/logout-button";

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

  return (
    <div className="flex flex-col gap-4 items-center">
      <p className="flex items-center gap-1 bg-muted/80 rounded-lg p-2">
        <SealCheckIcon className="fill-blue-500 size-5" weight="fill" />
        {handle}
      </p>
      <div className="relative aspect-square rounded-full overflow-hidden size-40 ring-2 ring-accent">
        {page.image_url ? (
          <img src={page.image_url} alt={handle} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            {handle}
          </div>
        )}
      </div>
      <p className="text-3xl tracking-wider font-bold">{page.title}</p>
      <p className="text-lg">{page.description}</p>

      <OwnerGate isOwner={isOwner}>
        <BottomActionBar />
      </OwnerGate>

      <ThemeToggle />
      <OwnerGate isOwner={isOwner}>
        <VisibilityToggle pageId={page.id} isPublic={page.is_public} />
      </OwnerGate>
      <LogoutButton />
    </div>
  );
}

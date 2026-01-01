import { useState } from "react";
import BottomActionBar from "@/components/bottom-action-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Route } from "./+types/($lang)._auth.user.$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SealCheckIcon } from "@phosphor-icons/react";
import VisibilityToggle from "@/components/visibility-toggle";
import { OwnerGate } from "@/components/owner-gate";
import UserAuthButton from "@/components/user-auth-button";
import ProfileHeaderEditor from "@/components/profile-header-editor";
import { cn } from "@/lib/utils";
import LayoutToggle from "@/components/layout-toggle";

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
        `h-full mx-auto flex flex-col container gap-4 transition-all duration-300 py-4`,
        isDesktop ? "max-w-7xl" : "max-w-lg border p-4 rounded-4xl shadow-lg"
      )}
    >
      <p className="flex items-center gap-1 bg-muted/80 rounded-lg p-2">
        <SealCheckIcon className="fill-blue-500 size-5" weight="fill" />
        {handle}
      </p>
      <ProfileHeaderEditor
        imageUrl={page.image_url}
        title={page.title}
        description={page.description}
        handle={handle}
        isOwner={isOwner}
      />

      <OwnerGate isOwner={isOwner}>
        <BottomActionBar />
      </OwnerGate>

      <ThemeToggle />
      <OwnerGate isOwner={isOwner}>
        <VisibilityToggle pageId={page.id} isPublic={page.is_public} />
      </OwnerGate>
      <UserAuthButton />
      <LayoutToggle isDesktop={isDesktop} onToggle={setIsDesktop} />
    </div>
  );
}

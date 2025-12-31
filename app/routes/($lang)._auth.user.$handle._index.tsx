import BottomActionBar from "@/components/bottom-action-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useParams } from "react-router";
import type { Route } from "./+types/($lang)._auth.user.$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  const { handle } = args.params;

  if (!handle) {
    throw new Response("Not Found", { status: 404 });
  }

  const supabase = await getSupabaseServerClient(args);
  const pageSelectQuery =
    "owner_id, handle, title, description, image_url, is_public, is_primary";

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

  if (!page.is_public && page.owner_id !== userId)
    throw new Response("Not Found", { status: 404 });

  return { page, handle };
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  const { page, handle } = loaderData;

  return (
    <div>
      <p>Current User handle: {handle}</p>
      <p>Page title: {page.title}</p>
      <p>Page description: {page.description}</p>
      <div className="relative aspect-square rounded-full overflow-hidden size-40">
        {page.image_url ? (
          <img src={page.image_url} alt={handle} className="w-full h-full " />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
            {handle}
          </div>
        )}
      </div>

      <BottomActionBar />
      <ThemeToggle />
    </div>
  );
}

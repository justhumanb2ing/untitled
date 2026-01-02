import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";
import BottomActionBar from "@/components/bottom-action-bar";
import type { Route } from "./+types/($lang)._auth.user.$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { LightningIcon, SealCheckIcon } from "@phosphor-icons/react";
import VisibilityToggle from "@/components/visibility-toggle";
import { OwnerGate } from "@/components/owner-gate";
import ProfileHeaderEditor from "@/components/profile-header-editor";
import { cn } from "@/lib/utils";
import LayoutToggle from "@/components/layout-toggle";
import { NumberTicker } from "@/components/effects/number-ticker";
import { Separator } from "@/components/ui/separator";
import { PageAutoSaveController } from "@/components/page-auto-save-controller";
import SavingStatusIndicator from "@/components/saving-status-indicator";

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
  const {
    page: { id, title, description, image_url, is_public },
    handle,
    isOwner,
  } = loaderData;
  const [isDesktop, setIsDesktop] = useState(true);
  const initialSnapshot = useMemo(
    () => ({
      title,
      description,
      image_url,
      layout: null,
    }),
    [title, description, image_url]
  );

  return (
    <PageAutoSaveController
      pageId={id}
      initialSnapshot={initialSnapshot}
      enabled={isOwner}
    >
      <div
        className={cn(
          `flex flex-col gap-4 transition-all ease-in-out duration-700 pt-4 bg-background relative`,
          isDesktop
            ? "max-w-full w-full h-full my-0 min-h-dvh"
            : "self-start max-w-lg border rounded-4xl shadow-lg mx-auto container my-6 min-h-[calc(100dvh-3rem)]"
        )}
      >
        {/* Page Header */}
        <header className="flex justify-between items-center gap-1 bg-muted/50 rounded-lg p-2 backdrop-blur-md sticky top-3 mx-4 px-4 z-10">
          <aside className="font-semibold flex items-center gap-1 truncate">
            <SealCheckIcon
              className="fill-blue-500 size-4 lg:size-5"
              weight="fill"
            />
            <span className="text-sm lg:text-base truncate">{handle}</span>
          </aside>
          <div className="flex items-center gap-2 shrink-0">
            <OwnerGate isOwner={isOwner}>
              <div className="flex items-center gap-1">
                <SavingStatusIndicator className="mr-2" />
                <VisibilityToggle pageId={id} isPublic={is_public} />
              </div>
            </OwnerGate>
            <Separator orientation="vertical" className={"my-1"} />
            <p className="text-xs ">
              <NumberTicker
                value={187}
                className="text-foreground dark:text-foreground"
              />{" "}
              View
            </p>
          </div>
        </header>

        <div
          className={cn(
            "flex flex-col grow lg:flex-row",
            !isDesktop && "flex-col!"
          )}
        >
          {/* Page Information Section */}
          <section className="max-w-2xl p-6">
            <ProfileHeaderEditor
              pageId={id}
              imageUrl={image_url}
              title={title}
              description={description}
              handle={handle}
              isOwner={isOwner}
            />
          </section>
          {/* Page Layout Section */}
          <section className="p-10 py-6 grow">page layout section</section>
        </div>

        <LayoutToggle isDesktop={isDesktop} onToggle={setIsDesktop} />

        {/* Footer + Action bar */}
        <footer
          className={cn(
            "text-sm text-muted-foreground relative flex items-center justify-center gap-1 h-32 px-8",
            "flex-col gap-3 lg:flex-row lg:justify-start",
            !isDesktop && "flex-col! justify-center! gap-3"
          )}
        >
          <div className={cn("flex items-center", isDesktop && "lg:flex-1")}>
            <BottomActionBar isOwner={isOwner} />
          </div>
          <p className="flex items-center gap-1 text-center">
            <LightningIcon weight="fill" />
            Powered by Untitled
          </p>
          <div
            aria-hidden="true"
            className={cn("hidden", isDesktop && "lg:block lg:flex-1")}
          />
        </footer>
      </div>
    </PageAutoSaveController>
  );
}

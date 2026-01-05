import { useEffect, useMemo, useState } from "react";
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
import {
  fetchUmamiVisits,
  getTodayRange,
  resolveUmamiConfig,
  UMAMI_TIMEZONE,
  UMAMI_UNIT,
  UMAMI_WEBSITE_ID,
  type UmamiResponse,
} from "../../service/umami/umami";
import PageBrickSection from "@/components/page-brick-section";
import Toolbar from "@/components/toolbar";

type PreviewLayout = "desktop" | "mobile";

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

  let umamiResult: UmamiResponse | null = null;

  if (isOwner) {
    const umamiConfig = resolveUmamiConfig();

    if (!umamiConfig) {
      umamiResult = {
        ok: false,
        status: 500,
        error: "Missing Umami environment configuration.",
      };
    } else {
      try {
        const { startAt, endAt } = getTodayRange(UMAMI_TIMEZONE);
        umamiResult = await fetchUmamiVisits({
          ...umamiConfig,
          websiteId: UMAMI_WEBSITE_ID,
          startAt,
          endAt,
          unit: UMAMI_UNIT,
          timezone: UMAMI_TIMEZONE,
          pageId: page.id,
        });
      } catch (error) {
        umamiResult = {
          ok: false,
          status: 500,
          error: error instanceof Error ? error.message : error,
        };
      }
    }
  }

  return { page, handle, isOwner, umamiResult };
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  const {
    page: { id, title, description, image_url, is_public },
    handle,
    isOwner,
    umamiResult,
  } = loaderData;
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>("desktop");
  const isMobilePreview = previewLayout === "mobile";
  const initialSnapshot = useMemo(
    () => ({
      title,
      description,
      image_url,
      layout: null,
    }),
    [title, description, image_url]
  );

  useEffect(() => {
    if (!id) return;

    umami.track((props) => ({
      ...props,
      website: UMAMI_WEBSITE_ID,
      url: `/user/${id}`,
      title: `${handle} Page`,
      page_id: id,
    }));
  }, [id, handle]);

  return (
    <PageAutoSaveController
      pageId={id}
      initialSnapshot={initialSnapshot}
      enabled={isOwner}
    >
      <div
        className={cn(
          `flex flex-col gap-4 transition-all ease-in-out duration-700 bg-background relative`,
          isMobilePreview
            ? "self-start border rounded-4xl shadow-lg max-w-lg mx-auto container my-6 h-[calc(100dvh-3rem)] overflow-hidden"
            : "max-w-full w-full h-full my-0 min-h-dvh xl:h-dvh xl:overflow-hidden"
        )}
      >
        <div
          className={cn(
            "relative flex flex-col gap-4 grow min-h-0",
            isMobilePreview &&
              "overflow-y-auto overscroll-contain scrollbar-hide"
          )}
        >
          <header
            className={cn(
              "rounded-lg absolute z-10 overflow-hidden w-fit shrink-0 hidden",
              isMobilePreview ? "block top-3.5 left-0" : "left-2 top-4 xl:block"
            )}
          >
            <div className={cn("w-full px-4", isMobilePreview ? "" : "px-4")}>
              <div className="flex justify-between items-center gap-2 bg-secondary rounded-lg p-2 backdrop-blur-md overflow-hidden py-2 px-4">
                <div className="flex items-center gap-2 justify-end shrink-0">
                  <OwnerGate isOwner={isOwner}>
                    <div className="flex items-center gap-1">
                      <SavingStatusIndicator />
                    </div>
                  </OwnerGate>
                  <Separator orientation="vertical" className={"my-1"} />
                  {umamiResult && umamiResult.ok ? (
                    <p className="text-xs">
                      <NumberTicker
                        value={umamiResult.data!.visits || 0}
                        className="text-foreground dark:text-foreground"
                      />{" "}
                      View
                    </p>
                  ) : (
                    <p>Error</p>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div
            className={cn(
              "flex flex-col gap-4 grow max-w-lg relative",
              isMobilePreview
                ? "flex-col! mx-0 gap-4"
                : "xl:flex-row mx-auto xl:max-w-11/12 container xl:gap-8 xl:flex-1 xl:min-h-0"
            )}
          >
            <header
              className={cn(
                "rounded-lg absolute z-10 overflow-hidden w-fit shrink-0 block",
                isMobilePreview
                  ? "hidden top-3.5 left-0"
                  : "left-2 top-4 xl:hidden"
              )}
            >
              <div className={cn("w-full px-4", isMobilePreview ? "" : "px-4")}>
                <div className="flex justify-between items-center gap-2 bg-secondary rounded-lg p-2 backdrop-blur-md overflow-hidden py-2 px-4">
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    <OwnerGate isOwner={isOwner}>
                      <div className="flex items-center gap-1">
                        <SavingStatusIndicator />
                      </div>
                    </OwnerGate>
                    <Separator orientation="vertical" className={"my-1"} />
                    {umamiResult && umamiResult.ok ? (
                      <p className="text-xs">
                        <NumberTicker
                          value={umamiResult.data!.visits || 0}
                          className="text-foreground dark:text-foreground"
                        />{" "}
                        View
                      </p>
                    ) : (
                      <p>Error</p>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Page Information Section */}
            <section
              className={cn(
                "max-w-2xl shrink relative",
                isMobilePreview ? "py-0" : "xl:py-24 xl:flex-5"
              )}
            >
              <ProfileHeaderEditor
                pageId={id}
                imageUrl={image_url}
                title={title}
                description={description}
                handle={handle}
                isOwner={isOwner}
                isMobilePreview={isMobilePreview}
                isPublic={is_public}
              />
              <div className="flex justify-center mb-4">
                <p className="flex items-center gap-1 text-center text-primary/40 font-medium">
                  <LightningIcon weight="fill" />
                  Powered by Untitled
                </p>
              </div>
            </section>

            {/* Page Brick Section */}
            <section
              className={cn(
                "px-4 grow shrink-0 scrollbar-hide",
                isMobilePreview
                  ? "max-w-full py-0 px-8"
                  : "xl:px-0 xl:py-24 xl:flex-8 xl:w-full xl:max-w-[878px] xl:min-h-0 xl:overflow-y-auto"
              )}
            >
              <PageBrickSection />
            </section>
          </div>

          {/* Action bar */}
          <aside
            className={cn(
              "static h-28 py-12 border-t flex items-center justify-center",
              !isMobilePreview &&
                "xl:fixed xl:bottom-10 xl:left-10 xl:px-0 xl:mb-0 xl:py-0 xl:h-fit xl:border-none"
            )}
          >
            <div className={cn("flex")}>
              <BottomActionBar isOwner={isOwner} />
            </div>
          </aside>
        </div>

        <LayoutToggle
          isDesktop={!isMobilePreview}
          onToggle={setPreviewLayout}
        />

        {/* <Toolbar /> */}
      </div>
    </PageAutoSaveController>
  );
}

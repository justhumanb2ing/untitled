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
            ? "self-start max-w-lg border rounded-4xl shadow-lg mx-auto container my-6 h-[calc(100dvh-3rem)] overflow-hidden"
            : "max-w-full w-full h-full my-0 min-h-dvh xl:h-dvh xl:overflow-hidden"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-4 grow min-h-0",
            isMobilePreview &&
              "overflow-y-auto overscroll-contain scrollbar-hide"
          )}
        >
          <header
            className={cn(
              "rounded-lg sticky z-10 overflow-hidden w-full shrink-0",
              isMobilePreview ? "top-3" : "top-3"
            )}
          >
            <div className={cn("w-full px-4", isMobilePreview ? "" : "px-4")}>
              <div className="flex justify-between items-center gap-2 bg-muted/50 rounded-lg p-2 backdrop-blur-md overflow-hidden py-2.5">
                <aside className="font-semibold flex items-center gap-1 min-w-0">
                  <SealCheckIcon
                    className="fill-blue-500 size-5"
                    weight="fill"
                  />
                  <p className="text-sm truncate lg:w-full lg:text-base">
                    {handle}
                  </p>
                </aside>

                <div className="flex items-center gap-2 justify-end shrink-0">
                  <OwnerGate isOwner={isOwner}>
                    <div className="flex items-center gap-1">
                      <SavingStatusIndicator className="mr-2" />
                      <div
                        className={cn(
                          "hidden",
                          isMobilePreview ? "hidden" : "xl:block"
                        )}
                      >
                        <VisibilityToggle pageId={id} isPublic={is_public} />
                      </div>
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
              "flex flex-col gap-4 grow max-w-lg",
              isMobilePreview
                ? "flex-col! mx-0 gap-4"
                : "xl:flex-row mx-auto xl:max-w-11/12 container xl:gap-8 xl:flex-1 xl:min-h-0"
            )}
          >
            {/* Page Information Section */}
            <section
              className={cn(
                "max-w-2xl p-4 sm:p-6 shrink relative",
                isMobilePreview ? "" : "xl:flex-5"
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
              />
              <OwnerGate isOwner={isOwner}>
                <div
                  className={cn(
                    "absolute top-6 right-10",
                    isMobilePreview ? "block" : "xl:hidden"
                  )}
                >
                  <VisibilityToggle pageId={id} isPublic={is_public} />
                </div>
              </OwnerGate>
            </section>

            {/* Page Brick Section */}
            <section
              className={cn(
                "px-4 sm:px-10 grow shrink-0 scrollbar-hide",
                isMobilePreview
                  ? "max-w-full py-0"
                  : "xl:px-0 xl:py-6 xl:flex-8 xl:w-full xl:max-w-[878px] xl:min-h-0 xl:overflow-y-auto"
              )}
            >
              <PageBrickSection />
            </section>
          </div>

          {/* Footer + Action bar */}
          <footer
            className={cn(
              "text-sm text-muted-foreground relative flex items-center justify-center gap-1 h-32 px-8",
              "flex-col gap-3 lg:flex-row lg:justify-start",
              isMobilePreview && "flex-col! justify-center! gap-3 mb-4 py-8"
            )}
          >
            <div
              className={cn(
                "flex items-center",
                !isMobilePreview && "lg:flex-1"
              )}
            >
              <BottomActionBar isOwner={isOwner} />
            </div>
            <p className="flex items-center gap-1 text-center">
              <LightningIcon weight="fill" />
              Powered by Untitled
            </p>
            <div
              aria-hidden="true"
              className={cn("hidden", !isMobilePreview && "lg:block lg:flex-1")}
            />
          </footer>
        </div>

        <LayoutToggle
          isDesktop={!isMobilePreview}
          onToggle={setPreviewLayout}
        />
      </div>
    </PageAutoSaveController>
  );
}

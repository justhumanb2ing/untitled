import { useMemo, useState } from "react";
import BottomActionBar from "@/components/layout/bottom-action-bar";
import type { Route } from "./+types/($lang).$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import ProfileHeaderEditor from "@/components/profile/profile-header-editor";
import { cn } from "@/lib/utils";
import LayoutToggle from "@/components/layout/layout-toggle";
import { PageAutoSaveController } from "@/components/page/page-auto-save-controller";
import { useUmamiPageView } from "@/hooks/use-umami-page-view";
import {
  fetchUmamiVisits,
  getTodayRange,
  resolveUmamiConfig,
  UMAMI_TIMEZONE,
  UMAMI_UNIT,
  type UmamiResponse,
} from "../../service/umami/umami";
import AppToolbar from "@/components/layout/app-toolbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageGridBrickSection from "@/components/page/page-grid-brick-section";
import { PageGridProvider } from "@/components/page/page-grid-context";
import { parsePageLayoutSnapshot } from "../../service/pages/page-grid";
import {
  DesktopBadgeView,
  MobileBadgeView,
} from "@/components/profile/profile-badge-view";
import { OwnerGate } from "@/components/account/owner-gate";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/analytics/umami-events";
import { buildMeta } from "@/lib/metadata";
import SavingStatusIndicator from "@/components/page/saving-status-indicator";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function meta({ loaderData, location, params }: Route.MetaArgs) {
  const page = loaderData?.page;
  const handle = loaderData?.handle ?? params.handle;
  const title = page?.title ?? handle ?? "User Page";

  return buildMeta({
    title,
    description: page?.description,
    image: page?.image_url,
    path: location.pathname,
    type: "profile",
  });
}

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

  const { data: pageLayout, error: pageLayoutError } = await supabase
    .from("page_layouts")
    .select("layout")
    .eq("page_id", page.id)
    .maybeSingle();

  if (pageLayoutError) {
    throw new Response(pageLayoutError.message, { status: 500 });
  }

  let umamiResult: UmamiResponse | null = null;

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
        websiteId: umamiConfig.websiteId,
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

  return {
    page,
    handle,
    isOwner,
    umamiResult,
    pageLayout: pageLayout?.layout ?? null,
  };
}

export default function UserProfileRoute({ loaderData }: Route.ComponentProps) {
  const {
    page: { id, owner_id, title, description, image_url, is_public },
    handle,
    isOwner,
    umamiResult,
    pageLayout,
  } = loaderData;
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>("desktop");
  const isMobilePreview = previewLayout === "mobile";
  const initialSnapshot = useMemo(
    () => ({
      title,
      description,
      image_url,
      layout: pageLayout ?? null,
    }),
    [title, description, image_url, pageLayout]
  );
  const initialBricks = useMemo(
    () => parsePageLayoutSnapshot(pageLayout),
    [pageLayout]
  );

  const pageViewProps = useMemo(
    () => ({
      [UMAMI_PROP_KEYS.ctx.pageId]: id,
      [UMAMI_PROP_KEYS.ctx.pageKind]: "user_profile",
      [UMAMI_PROP_KEYS.ctx.role]: isOwner ? "owner" : "viewer",
    }),
    [id, isOwner]
  );

  useUmamiPageView({
    url: id ? `/user/${id}` : undefined,
    title: "User Page",
    props: pageViewProps,
    eventName: UMAMI_EVENTS.page.userProfileView,
    dedupeKey: id ? `user:${id}` : undefined,
  });

  return (
    <PageAutoSaveController
      pageId={id}
      initialSnapshot={initialSnapshot}
      enabled={isOwner}
    >
      <PageGridProvider
        pageId={id}
        ownerId={owner_id}
        isOwner={isOwner}
        initialBricks={initialBricks}
      >
        <div
          className={cn(
            `flex flex-col gap-4 transition-all ease-in-out duration-700 bg-background relative`,
            "max-w-full w-full h-full my-0 min-h-dvh",
            // !isMobilePreview && "xl:h-dvh xl:overflow-hidden",
            // isMobilePreview && "rounded-3xl"
            isMobilePreview
              ? "self-start border rounded-[36px] shadow-lg max-w-lg mx-auto container h-[calc(100dvh-12rem)] overflow-hidden"
              : "max-w-full w-full h-full my-0 min-h-dvh xl:h-dvh xl:overflow-hidden"
          )}
        >
          <div
            className={cn(
              "relative flex flex-col gap-4 grow min-h-0",
              isMobilePreview
                ? "overflow-y-auto overscroll-contain scrollbar-hide"
                : "mx-auto container max-w-lg xl:max-w-full"
            )}
          >
            {/* Desktop Badge View */}
            {/* <DesktopBadgeView
              isOwner={isOwner}
              umamiResult={umamiResult}
              isMobilePreview={isMobilePreview}
            /> */}

            <div
              className={cn(
                "flex flex-col gap-4 grow relative",
                !isMobilePreview &&
                  "mx-auto container xl:mx-0 xl:flex-row xl:min-h-0 max-w-full xl:justify-between"
              )}
            >
              {/* Mobile Badge View */}
              {/* <MobileBadgeView
                isOwner={isOwner}
                umamiResult={umamiResult}
                isMobilePreview={isMobilePreview}
              /> */}

              {/* Page Information Section */}
              <section
                className={cn(
                  "shrink sticky top-0 z-0 h-dvh",
                  !isMobilePreview &&
                    "xl:flex xl:w-1/3 xl:static xl:h-auto xl:py-0"
                )}
              >
                <ProfileHeaderEditor
                  pageId={id}
                  userId={owner_id}
                  imageUrl={image_url}
                  title={title}
                  description={description}
                  handle={handle}
                  isOwner={isOwner}
                  isMobilePreview={isMobilePreview}
                  isPublic={is_public}
                />
              </section>

              {/* Page Brick Section - Mobile App Style Bottom Sheet */}
              <div
                className={cn(
                  isMobilePreview ? "" : "xl:grow xl:flex xl:justify-center"
                )}
              >
                <section
                  className={cn(
                    "shrink-0 sticky z-10",
                    "bg-background rounded-t-3xl",
                    !isMobilePreview &&
                      "xl:static xl:z-0 xl:w-full xl:max-w-[880px] xl:rounded-t-[32px] xl:top-32 xl:overflow-hidden"
                  )}
                >
                  {/* Drag Handle Indicator */}
                  <div
                    className={cn(
                      "sticky top-0 z-20 flex justify-center pt-3 pb-2 bg-background rounded-t-3xl",
                      isMobilePreview
                        ? "rounded-t-3xl"
                        : "xl:hidden xl:rounded-none"
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-1 rounded-full bg-muted-foreground/25",
                        "transition-colors duration-200"
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  {initialBricks.length === 0 && (
                    <Empty className="h-full">
                      <EmptyHeader>
                        <EmptyTitle className="text-lg">Empty</EmptyTitle>
                        <EmptyDescription className="text-sm/relaxed">
                          Everything remains the same for the time being.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                  <ScrollArea
                    className={cn(
                      "w-full h-[calc(100%-20px)]",
                      !isMobilePreview && "xl:w-[880px]"
                    )}
                    scrollFade
                    scrollbarGutter
                    scrollbarHidden
                  >
                    <div
                      className={cn(
                        "w-full px-3 pb-32 pt-4",
                        !isMobilePreview && "xl:px-0"
                      )}
                    >
                      <PageGridBrickSection isMobilePreview={isMobilePreview} />
                    </div>
                  </ScrollArea>
                </section>
              </div>
            </div>

            <Separator
              className={cn(
                "block xl:hidden data-[orientation=horizontal]:bg-muted data-[orientation=horizontal]:h-2"
              )}
            />

            {/* TODO: xl 이상일 때 위치 변경 */}
            {/* Action bar */}
            <aside
              className={cn(
                "rounded bg-background static h-28 py-6 pb-10 flex items-center justify-center xl:fixed xl:bottom-10 xl:right-48 xl:px-2 xl:mb-0 xl:py-2 xl:h-fit xl:border"
              )}
            >
              <BottomActionBar
                isOwner={isOwner}
                isMobilePreview={isMobilePreview}
              />
            </aside>
          </div>

          <OwnerGate isOwner={isOwner}>
            <LayoutToggle
              isDesktop={!isMobilePreview}
              onToggle={setPreviewLayout}
            />
            {/* <div className="flex items-center gap-1">
              <SavingStatusIndicator />
            </div> */}
          </OwnerGate>

          <aside
            className={cn(
              "fixed bottom-28 right-48",
              isMobilePreview ? "hidden" : "hidden xl:block"
            )}
          >
            <AppToolbar isMobilePreview={isMobilePreview} />
          </aside>
        </div>
      </PageGridProvider>
    </PageAutoSaveController>
  );
}

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

type UmamiResponse = {
  ok: boolean;
  status?: number;
  data?: {
    visits: number;
  };
  error?: unknown;
};

type UmamiConfig = {
  apiEndpoint: string;
  apiKey: string;
};

const UMAMI_WEBSITE_ID = "913b402f-ffb7-4247-8407-98b91b9ec264";
const UMAMI_TIMEZONE = "Asia/Seoul";
const UMAMI_UNIT = "day";
const UMAMI_ENDPOINT_PATH = "websites";

function getDateParts(value: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Failed to resolve date parts.");
  }

  return { year, month, day };
}

function getTimeZoneOffsetMs(timeZone: string, value: Date) {
  const tzDate = new Date(value.toLocaleString("en-US", { timeZone }));
  const utcDate = new Date(value.toLocaleString("en-US", { timeZone: "UTC" }));

  return tzDate.getTime() - utcDate.getTime();
}

function getTodayRange(timeZone: string) {
  const today = new Date();
  const { year, month, day } = getDateParts(today, timeZone);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  const offsetMs = getTimeZoneOffsetMs(timeZone, utcMidnight);
  const startAt = utcMidnight.getTime() - offsetMs;
  const endAt = startAt + 24 * 60 * 60 * 1000;

  return { startAt, endAt };
}

function resolveUmamiConfig(): UmamiConfig | null {
  const apiKey = process.env.UMAMI_API_KEY;
  const apiEndpoint = process.env.UMAMI_API_CLIENT_ENDPOINT;

  if (!apiKey || !apiEndpoint) {
    return null;
  }

  return { apiEndpoint, apiKey };
}

function getVisitsFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (!("visits" in payload)) {
    return null;
  }

  const visits = (payload as { visits?: unknown }).visits;
  return typeof visits === "number" ? visits : null;
}

/**
 * Fetches Umami visit stats for the given website and time range.
 */
async function fetchUmamiVisits(params: {
  apiEndpoint: string;
  apiKey: string;
  websiteId: string;
  startAt: number;
  endAt: number;
  unit: string;
  timezone: string;
}): Promise<UmamiResponse> {
  const baseUrl = params.apiEndpoint.endsWith("/")
    ? params.apiEndpoint
    : `${params.apiEndpoint}/`;
  const statsUrl = new URL(
    `${UMAMI_ENDPOINT_PATH}/${params.websiteId}/stats`,
    baseUrl
  );
  const searchParams = new URLSearchParams({
    startAt: String(params.startAt),
    endAt: String(params.endAt),
    unit: params.unit,
    timezone: params.timezone,
  });

  statsUrl.search = searchParams.toString();
  const response = await fetch(statsUrl.toString(), {
    headers: {
      Accept: "application/json",
      "x-umami-api-key": params.apiKey,
    },
  });

  const payload = await response.json().catch(() => null);
  const visits = getVisitsFromPayload(payload);

  if (!response.ok || visits === null) {
    return {
      ok: false,
      status: response.status,
      error:
        payload ?? "Failed to fetch Umami stats or missing visits in response.",
    };
  }

  return {
    ok: true,
    status: response.status,
    data: {
      visits,
    },
  };
}

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

  useEffect(() => {
    if (!id) return;
    if (!(window as any)?.umami) return;

    (window as any).umami.track((props: any) => ({
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

        <OwnerGate isOwner={isOwner}>
          {umamiResult && (
            <section className="mx-4 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Umami response {umamiResult.ok ? "OK" : "Error"} (
                {umamiResult.status ?? "unknown"})
              </p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap wrap-break-word">
                {JSON.stringify(umamiResult, null, 2)}
              </pre>
            </section>
          )}
        </OwnerGate>

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

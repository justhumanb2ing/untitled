import { useMemo, useState } from "react";
import type { Route } from "./+types/($lang).$handle._index";
import { getAuth } from "@clerk/react-router/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { PageAutoSaveController } from "@/components/page/page-auto-save-controller";
import {
  fetchUmamiVisits,
  getTodayRange,
  resolveUmamiConfig,
  UMAMI_TIMEZONE,
  UMAMI_UNIT,
  type UmamiResponse,
} from "../../service/umami/umami";
import { PageGridProvider } from "@/components/page/page-grid-context";
import { parsePageLayoutSnapshot } from "../../service/pages/page-grid";
import { generateMeta } from "@forge42/seo-tools/remix/metadata";
import { breadcrumbs } from "@forge42/seo-tools/structured-data/breadcrumb";
import { profile } from "@forge42/seo-tools/structured-data/profile";
import { metadataConfig } from "@/config/metadata";
import { getLocalizedPath } from "@/utils/localized-path";
import { useUserProfilePageView } from "@/hooks/use-user-profile-pageview";
import UserProfileLayout from "@/components/profile/user-profile-layout";

type PreviewLayout = "desktop" | "mobile";

const buildUrl = (lang: string | undefined, pathname: string) =>
  new URL(getLocalizedPath(lang, pathname), metadataConfig.url).toString();

const defaultImageUrl = new URL(
  metadataConfig.defaultImage,
  metadataConfig.url
).toString();

export const meta = ({ loaderData, params }: Route.MetaArgs) => {
  const handle = params.handle ?? "user";
  const url = buildUrl(params.lang, `/${handle}`);
  const title = loaderData?.page?.title ?? handle;
  const description =
    loaderData?.page?.description ?? "Personal profile page on beyondthewave.";
  const imageUrl = loaderData?.page?.image_url ?? defaultImageUrl;

  return generateMeta(
    {
      title,
      description,
      url,
      image: imageUrl,
      siteName: metadataConfig.title,
      twitterCard: metadataConfig.twitterCard,
    },
    [
      {
        "script:ld+json": breadcrumbs(url, ["Home", title]),
      },
      {
        "script:ld+json": profile({
          "@type": "ProfilePage",
          name: title,
          description,
          image: imageUrl,
          url,
        }),
      },
    ]
  );
};

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

  useUserProfilePageView({ id, isOwner });

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
        <UserProfileLayout
          pageId={id}
          ownerId={owner_id}
          title={title}
          description={description}
          imageUrl={image_url}
          handle={handle}
          isOwner={isOwner}
          isPublic={is_public}
          isMobilePreview={isMobilePreview}
          onTogglePreview={setPreviewLayout}
          isEmpty={initialBricks.length === 0}
        />
      </PageGridProvider>
    </PageAutoSaveController>
  );
}

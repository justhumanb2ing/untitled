import { getAuth } from "@clerk/react-router/server";
import { Outlet, redirect } from "react-router";

import type { Route } from "./+types/($lang)._auth";

function getLocalizedPath(lang: string | undefined, pathname: string) {
  if (!pathname.startsWith("/")) {
    throw new Error("pathname must start with '/'");
  }
  return lang ? `/${lang}${pathname}` : pathname;
}

function isPublicAuthPath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, "");
  const authSegmentPattern = /(^|\/)(sign-in|sign-up)(\/|$)/;

  return authSegmentPattern.test(normalizedPathname);
}

export async function loader(args: Route.LoaderArgs) {
  const { pathname } = new URL(args.request.url);
  if (isPublicAuthPath(pathname)) {
    return null;
  }

  const auth = await getAuth(args);

  if (!auth.userId) {
    throw redirect(getLocalizedPath(args.params.lang, "/sign-in"));
  }

  return null;
}

export default function ProtectedLayout() {
  return (
    <main className="h-full flex justify-center items-center">
      <Outlet />
    </main>
  );
}

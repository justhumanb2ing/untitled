import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  redirect,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import Providers from "./providers";
import { shadcn } from "@clerk/themes";
import {
  clerkClient,
  clerkMiddleware,
  rootAuthLoader,
} from "@clerk/react-router/server";
import { ClerkProvider } from "@clerk/react-router";
import { locales } from "intlayer";
import { Spinner } from "./components/ui/spinner";

const themeInitScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (storedTheme === "light") {
      document.documentElement.classList.remove("dark");
    }
  } catch {
    // Ignore storage access errors (privacy modes, disabled storage).
  }
})();
`;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const middleware: Route.MiddlewareFunction[] = [clerkMiddleware()];

function getLocalizedPathFromPathname(pathname: string, targetPath: string) {
  if (!targetPath.startsWith("/")) {
    throw new Error("pathname must start with '/'");
  }

  const [, maybeLocale] = pathname.split("/");
  const locale = locales.find((value) => value === maybeLocale);

  return locale ? `/${locale}${targetPath}` : targetPath;
}

function isPublicAuthPath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, "");
  const authSegmentPattern = /(^|\/)(sign-in|sign-up)(\/|$)/;

  return authSegmentPattern.test(normalizedPathname);
}

function isOnboardingPath(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, "");
  const onboardingSegmentPattern = /(^|\/)onboarding(\/|$)/;

  return onboardingSegmentPattern.test(normalizedPathname);
}

export const loader = (args: Route.LoaderArgs) =>
  rootAuthLoader(args, async (loaderArgs) => {
    const { pathname } = new URL(loaderArgs.request.url);
    const { auth } = loaderArgs.request;

    if (auth.userId) {
      if (isOnboardingPath(pathname) || isPublicAuthPath(pathname)) {
        return null;
      }

      const onboardingComplete =
        auth.sessionClaims?.metadata?.onboardingComplete === true;

      if (!onboardingComplete) {
        const clerk = clerkClient(loaderArgs);
        const user = await clerk.users.getUser(auth.userId);
        const hasOnboardingComplete =
          user.publicMetadata?.onboardingComplete === true;

        if (!hasOnboardingComplete) {
          throw redirect(getLocalizedPathFromPathname(pathname, "/onboarding"));
        }
      }

      return null;
    }

    return null;
  });

export function Layout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation();
  const isNavigating = Boolean(navigation.location);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body className="relative">
        {isNavigating && (
          <Spinner className="size-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      appearance={{
        theme: shadcn,
        variables: {
          colorBackground: "white",
        },
        layout: {
          privacyPageUrl: "https://clerk.com/privacy",
          termsPageUrl: "https://clerk.com/legal/privacy",
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsPlacement: "bottom",
          socialButtonsVariant: "iconButton",
          logoPlacement: "outside",
        },
      }}
    >
      <main className="h-dvh flex flex-col">
        <Providers>
          <main className="grow">
            <Outlet />
          </main>
        </Providers>
      </main>
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

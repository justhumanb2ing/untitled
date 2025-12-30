import { clerkClient, getAuth } from "@clerk/react-router/server";
import { Form, redirect } from "react-router";

import type { Route } from "./+types/($lang)._auth.onboarding";

function getLocalizedPath(lang: string | undefined, pathname: string) {
  if (!pathname.startsWith("/")) {
    throw new Error("pathname must start with '/'");
  }
  return lang ? `/${lang}${pathname}` : pathname;
}

export async function action(args: Route.ActionArgs) {
  const auth = await getAuth(args);
  if (!auth.userId) {
    throw redirect(getLocalizedPath(args.params.lang, "/sign-in"));
  }

  const clerk = clerkClient(args);

  await clerk.users.updateUserMetadata(auth.userId, {
    publicMetadata: {
      onboardingComplete: true,
    },
  });

  throw redirect(getLocalizedPath(args.params.lang, "/"));
}

export default function OnboardingRoute() {
  return (
    <main>
      <h1>Onboarding</h1>
      <p>Finish onboarding to continue.</p>
      <Form method="post">
        <button type="submit">Complete onboarding</button>
      </Form>
    </main>
  );
}

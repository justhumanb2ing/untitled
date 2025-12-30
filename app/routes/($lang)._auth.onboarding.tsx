import { clerkClient, getAuth } from "@clerk/react-router/server";
import { Form, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/($lang)._auth.onboarding";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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

  await clerk.users.updateUser(auth.userId, {
    publicMetadata: {
      onboardingComplete: true,
    },
  });

  throw redirect(getLocalizedPath(args.params.lang, "/"));
}

export default function OnboardingRoute() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <main>
      <h1>Onboarding</h1>
      <p>Finish onboarding to continue.</p>
      <Form method="post">
        <Button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          data-icon={isSubmitting ? "inline-start" : undefined}
        >
          {isSubmitting ? (
            <>
              <Spinner />
              Completing...
            </>
          ) : (
            "Complete onboarding"
          )}
        </Button>
      </Form>
    </main>
  );
}

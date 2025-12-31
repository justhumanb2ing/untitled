import { clerkClient, getAuth } from "@clerk/react-router/server";
import { Activity, useEffect, useMemo, useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";
import { CaretLeftIcon, CheckIcon } from "@phosphor-icons/react";

import type { Route } from "./+types/($lang)._auth.onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperTrigger,
} from "@/components/ui/stepper";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { metadataConfig } from "@/config/metadata";
import { getSupabaseClient, getSupabaseServerClient } from "@/lib/supabase";

function getLocalizedPath(lang: string | undefined, pathname: string) {
  if (!pathname.startsWith("/")) {
    throw new Error("pathname must start with '/'");
  }
  return lang ? `/${lang}${pathname}` : pathname;
}

function parseOnboardingForm(formData: FormData) {
  const rawHandle = formData.get("handle");
  const rawTitle = formData.get("title");
  const rawDescription = formData.get("description");

  if (typeof rawHandle !== "string") {
    throw new Response("Handle is required.", { status: 400 });
  }

  const handle = rawHandle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!handle) {
    throw new Response("Handle is required.", { status: 400 });
  }

  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";

  if (!title || !description) {
    throw new Response("Title and description are required.", { status: 400 });
  }

  return { handle, title, description };
}

export async function action(args: Route.ActionArgs) {
  const auth = await getAuth(args);
  if (!auth.userId) {
    throw redirect(getLocalizedPath(args.params.lang, "/sign-in"));
  }

  const formData = await args.request.formData();
  let parsed: ReturnType<typeof parseOnboardingForm>;

  try {
    parsed = parseOnboardingForm(formData);
  } catch (error) {
    if (error instanceof Response) {
      return { formError: await error.text() };
    }

    throw error;
  }

  const { handle, title, description } = parsed;

  const supabase = await getSupabaseServerClient(args);
  const { error } = await supabase.rpc("create_page", {
    p_handle: `@${handle}`,
    p_title: title,
    p_description: description,
  });

  if (error) {
    return { formError: error.message };
  }

  const clerk = clerkClient(args);

  await clerk.users.updateUser(auth.userId, {
    publicMetadata: {
      onboardingComplete: true,
    },
  });

  throw redirect(getLocalizedPath(args.params.lang, `/user/@${handle}`));
}

export default function OnboardingRoute() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  const actionData = useActionData<typeof action>();
  type Step = "handle" | "details";
  type StepState = {
    handle: { value: string };
    details: { title: string; description: string };
  };
  const steps: Array<{ id: Step; label: string; value: number }> = [
    {
      id: "handle",
      label: "Choose a unique handle",
      value: 1,
    },
    { id: "details", label: "Fill out details", value: 2 },
  ];
  const [step, setStep] = useState<Step>("handle");
  const [stepState, setStepState] = useState<StepState>({
    handle: { value: "" },
    details: { title: "", description: "" },
  });
  const handleValue = stepState.handle.value;
  const { title, description } = stepState.details;
  const activeStep = step === "handle" ? 1 : 2;
  const activeStepItem = steps.find((item) => item.id === step);
  const isDetailsComplete =
    title.trim().length > 0 && description.trim().length > 0;
  const [handleError, setHandleError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const supabase = getSupabaseClient();
  
  useEffect(() => {
    if (actionData?.formError) {
      setDetailsError(actionData.formError);
    }
  }, [actionData?.formError]);

  useEffect(() => {
    if (step === "handle") {
      setDetailsError(null);
    }
  }, [step]);

  const handleAdvanceToDetails = async () => {
    if (isCheckingHandle) {
      return;
    }

    if (!handleValue) {
      setHandleError("Handle is required.");
      return;
    }

    if (!supabase) {
      setHandleError("Handle validation is unavailable.");
      return;
    }

    setIsCheckingHandle(true);
    setHandleError(null);

    let data: { id: string } | null = null;
    let error: { message: string } | null = null;

    try {
      const result = await (await supabase)
        .from("pages")
        .select("id")
        .eq("handle", `@${handleValue}`)
        .maybeSingle();
      data = result.data;
      error = result.error;
    } finally {
      setIsCheckingHandle(false);
    }

    if (error) {
      setHandleError(error.message);
      return;
    }

    if (data) {
      setHandleError("Handle already exists.");
      return;
    }

    setStep("details");
  };

  return (
    <main className="w-md">
      <section className="h-80 space-y-4">
        <Stepper
          value={activeStep}
          onValueChange={(value) => {
            if (value === 1) {
              setStep("handle");
              return;
            }
            if (value === 2 && handleValue) {
              setStep("details");
            }
          }}
        >
          {steps.map((stepItem, index) => (
            <StepperItem
              className="flex-1"
              key={stepItem.id}
              step={stepItem.value}
            >
              <StepperTrigger
                aria-current={stepItem.id === step ? "step" : undefined}
                asChild
                className="w-full flex-col items-start gap-2"
              >
                <StepperIndicator
                  asChild
                  className="h-1 w-full rounded-none bg-border"
                >
                  <span className="sr-only">{step}</span>
                </StepperIndicator>
              </StepperTrigger>
            </StepperItem>
          ))}
        </Stepper>
        <div className="flex gap-2">
          <Button
            type="button"
            size={"icon-lg"}
            variant={"ghost"}
            onClick={() => setStep("handle")}
            disabled={activeStep === 1}
            className={"mt-2"}
          >
            <CaretLeftIcon weight="bold" className="size-8" />
          </Button>
          <Form
            className="grow"
            method="post"
            onSubmit={(event) => {
              if (step === "handle") {
                event.preventDefault();
                void handleAdvanceToDetails();
              }
            }}
          >
            <aside className="mb-4">
              <div className="font-medium text-muted-foreground tabular-nums">
                Step {activeStep} of {steps.length}
              </div>
              <div className="text-foreground font-medium">
                {activeStepItem?.label}
              </div>
            </aside>
            <FieldSet>
              <Activity mode={step === "handle" ? "visible" : "hidden"}>
                <>
                  <Field className="mt-4 space-y-2">
                    <div className="relative">
                      <Input
                        id="handle"
                        name="handle"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="text"
                        pattern="[a-z0-9]+"
                        placeholder="Your handle"
                        value={handleValue}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "");
                          setStepState((prev) => ({
                            ...prev,
                            handle: { value: nextValue },
                          }));
                          setHandleError(null);
                        }}
                        className={cn("peer ps-25 border-none")}
                      />
                      <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                        {metadataConfig.handle}/@
                      </span>
                    </div>

                    <FieldDescription className="flex items-center gap-1">
                      <CheckIcon />
                      <span>
                        Only lowercase letters and numbers are allowed.
                      </span>
                    </FieldDescription>
                    <FieldError>{handleError}</FieldError>
                  </Field>
                  <Button
                    type="button"
                    size="lg"
                    variant={"brand"}
                    onClick={() => void handleAdvanceToDetails()}
                    disabled={!handleValue || isCheckingHandle}
                    aria-busy={isCheckingHandle}
                  >
                    Next
                  </Button>
                </>
              </Activity>
              <Activity mode={step === "details" ? "visible" : "hidden"}>
                <>
                  <Field className="mt-4 space-y-2">
                    <FieldLabel htmlFor="title">Page title</FieldLabel>
                    <Input
                      id="title"
                      name="title"
                      autoCapitalize="sentences"
                      autoFocus
                      autoComplete="off"
                      placeholder="Your page title"
                      value={title}
                      onChange={(event) =>
                        setStepState((prev) => ({
                          ...prev,
                          details: {
                            ...prev.details,
                            title: event.target.value,
                          },
                        }))
                      }
                      onInput={() => setDetailsError(null)}
                    />
                  </Field>
                  <Field className="space-y-2">
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      name="description"
                      autoComplete="off"
                      placeholder="Tell people about your page"
                      value={description}
                      onChange={(event) =>
                        setStepState((prev) => ({
                          ...prev,
                          details: {
                            ...prev.details,
                            description: event.target.value,
                          },
                        }))
                      }
                      onInput={() => setDetailsError(null)}
                    />
                    <FieldError>{detailsError}</FieldError>
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button
                      className={"w-full"}
                      size={"lg"}
                      type="submit"
                      variant={"brand"}
                      disabled={
                        isSubmitting || !handleValue || !isDetailsComplete
                      }
                      aria-busy={isSubmitting}
                      data-icon={isSubmitting ? "inline-start" : undefined}
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner />
                        </>
                      ) : (
                        "Complete"
                      )}
                    </Button>
                  </div>
                </>
              </Activity>
            </FieldSet>
          </Form>
        </div>
      </section>
    </main>
  );
}

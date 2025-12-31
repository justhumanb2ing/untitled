import { clerkClient, getAuth } from "@clerk/react-router/server";
import { Activity, useEffect, useRef, useState } from "react";
import {
  Form as RouterForm,
  redirect,
  useActionData,
  useNavigation,
  useSubmit,
} from "react-router";
import { CaretLeftIcon, CheckIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { Route } from "./+types/($lang)._auth.onboarding";
import { Button } from "@/components/ui/button";
import {
  Form as RhfForm,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperTrigger,
} from "@/components/ui/stepper";
import { FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { metadataConfig } from "@/config/metadata";
import { getSupabaseClient, getSupabaseServerClient } from "@/lib/supabase";

function getLocalizedPath(lang: string | undefined, pathname: string) {
  if (!pathname.startsWith("/")) {
    throw new Error("pathname must start with '/'");
  }
  return lang ? `/${lang}${pathname}` : pathname;
}

const onboardingSchema = z.object({
  handle: z
    .string()
    .transform((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    )
    .refine((value) => value.length > 0, "Handle is required."),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().min(1, "Description is required."),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type ActionData = {
  formError?: string;
  fieldErrors?: Partial<Record<keyof OnboardingFormValues, string>>;
};

export async function action(args: Route.ActionArgs) {
  const auth = await getAuth(args);
  if (!auth.userId) {
    throw redirect(getLocalizedPath(args.params.lang, "/sign-in"));
  }

  const formData = await args.request.formData();
  const parsed = onboardingSchema.safeParse({
    handle: formData.get("handle"),
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        handle: fieldErrors.handle?.[0],
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
      },
    } satisfies ActionData;
  }

  const { handle, title, description } = parsed.data;

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
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = navigation.state !== "idle";
  const actionData = useActionData<ActionData>();
  type Step = "handle" | "details";
  const steps: Array<{ id: Step; label: string; value: number }> = [
    {
      id: "handle",
      label: "Choose a unique handle",
      value: 1,
    },
    { id: "details", label: "Fill out details", value: 2 },
  ];
  const [step, setStep] = useState<Step>("handle");
  const activeStep = step === "handle" ? 1 : 2;
  const activeStepItem = steps.find((item) => item.id === step);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const supabase = getSupabaseClient();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { handle: "", title: "", description: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const handleValue = form.watch("handle") ?? "";
  const title = form.watch("title") ?? "";
  const description = form.watch("description") ?? "";
  const isDetailsComplete =
    title.trim().length > 0 && description.trim().length > 0;
  const rootError = form.formState.errors.root?.message;

  useEffect(() => {
    if (!actionData) {
      return;
    }

    if (actionData.fieldErrors?.handle) {
      form.setError("handle", {
        type: "server",
        message: actionData.fieldErrors.handle,
      });
      setStep("handle");
    }

    if (actionData.fieldErrors?.title) {
      form.setError("title", {
        type: "server",
        message: actionData.fieldErrors.title,
      });
    }

    if (actionData.fieldErrors?.description) {
      form.setError("description", {
        type: "server",
        message: actionData.fieldErrors.description,
      });
    }

    if (actionData.fieldErrors?.title || actionData.fieldErrors?.description) {
      setStep("details");
    }

    if (actionData.formError) {
      form.setError("root", {
        type: "server",
        message: actionData.formError,
      });
    }
  }, [actionData, form]);

  useEffect(() => {
    if (step === "handle") {
      form.clearErrors("root");
    }
  }, [form, step]);

  const handleAdvanceToDetails = async () => {
    if (isCheckingHandle) {
      return;
    }

    const isHandleValid = await form.trigger("handle");
    if (!isHandleValid) {
      return;
    }

    if (!supabase) {
      form.setError("handle", {
        type: "manual",
        message: "Handle validation is unavailable.",
      });
      return;
    }

    setIsCheckingHandle(true);
    form.clearErrors("handle");

    let data: { id: string } | null = null;
    let error: { message: string } | null = null;
    const sanitizedHandle = form.getValues("handle");

    try {
      const result = await (await supabase)
        .from("pages")
        .select("id")
        .eq("handle", `@${sanitizedHandle}`)
        .maybeSingle();
      data = result.data;
      error = result.error;
    } finally {
      setIsCheckingHandle(false);
    }

    if (error) {
      form.setError("handle", {
        type: "manual",
        message: error.message,
      });
      return;
    }

    if (data) {
      form.setError("handle", {
        type: "manual",
        message: "Handle already exists.",
      });
      return;
    }

    setStep("details");
  };

  const submitForm = form.handleSubmit(() => {
    if (!formRef.current) {
      return;
    }
    submit(formRef.current, { method: "post" });
  });

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
          {steps.map((stepItem) => (
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
          <RhfForm {...form}>
            <RouterForm
              ref={formRef}
              className="grow"
              method="post"
              onSubmit={(event) => {
                if (step === "handle") {
                  event.preventDefault();
                  void handleAdvanceToDetails();
                  return;
                }
                void submitForm(event);
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
                    <FormField
                      control={form.control}
                      name="handle"
                      render={({ field }) => (
                        <FormItem className="mt-4 space-y-2">
                          <FormLabel className="sr-only">Handle</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                {...field}
                                autoCapitalize="none"
                                autoCorrect="off"
                                autoFocus={step === "handle"}
                                autoComplete="off"
                                spellCheck={false}
                                inputMode="text"
                                pattern="[a-z0-9]+"
                                placeholder="Your handle"
                                value={field.value ?? ""}
                                onChange={(event) => {
                                  const nextValue = event.currentTarget.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, "");
                                  field.onChange(nextValue);
                                  form.clearErrors("handle");
                                  form.clearErrors("root");
                                }}
                                className={cn("peer ps-25 border-none")}
                              />
                            </FormControl>
                            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-sm peer-disabled:opacity-50">
                              {metadataConfig.handle}/@
                            </span>
                          </div>

                          <FormDescription className="flex items-center gap-1">
                            <CheckIcon />
                            <span>
                              Only lowercase letters and numbers are allowed.
                            </span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="mt-4 space-y-2">
                          <FormLabel>Page title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoCapitalize="sentences"
                              autoFocus={step === "details"}
                              autoComplete="off"
                              placeholder="Your page title"
                              value={field.value ?? ""}
                              onChange={(event) => {
                                field.onChange(event);
                                form.clearErrors("root");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              autoComplete="off"
                              placeholder="Tell people about your page"
                              value={field.value ?? ""}
                              onChange={(event) => {
                                field.onChange(event);
                                form.clearErrors("root");
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {rootError ? (
                      <p className="text-destructive text-sm" role="alert">
                        {rootError}
                      </p>
                    ) : null}
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
            </RouterForm>
          </RhfForm>
        </div>
      </section>
    </main>
  );
}

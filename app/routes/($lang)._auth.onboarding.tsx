import { clerkClient, getAuth } from "@clerk/react-router/server";
import { useEffect, useRef, useState } from "react";
import {
  Form as RouterForm,
  redirect,
  useActionData,
  useNavigation,
  useNavigate,
  useParams,
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
import { getLocalizedPath } from "@/lib/localized-path";
import { Activity } from "@/components/motion/activity";

const onboardingSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+$/, "Only lowercase letters and numbers are allowed."),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().nullable(),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type ActionData = {
  formError?: string;
  fieldErrors?: Partial<Record<keyof OnboardingFormValues, string>>;
  success?: boolean;
  handle?: string;
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
    p_description: description ?? undefined,
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

  return {
    success: true,
    handle: `@${handle}`,
  } satisfies ActionData;
}

export default function OnboardingRoute() {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { lang } = useParams();
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = navigation.state !== "idle";
  const actionData = useActionData<ActionData>();
  type Step = "handle" | "details" | "complete";
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
  const isCompleteStep = step === "complete";
  const [completedHandle, setCompletedHandle] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);

  const supabase = getSupabaseClient();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { handle: "", title: "", description: "" },
    mode: "onChange",
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

    if (actionData.success && actionData.handle) {
      setCompletedHandle(actionData.handle);
      setDirection(1);
      setStep("complete");
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

    setDirection(1);
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
        {isCompleteStep ? null : (
          <Stepper
            value={activeStep}
            onValueChange={(value) => {
              if (value === 1) {
                setDirection(-1);
                setStep("handle");
                return;
              }

              if (value === 2 && handleValue) {
                setDirection(1);
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
        )}
        <div className="flex gap-2">
          {isCompleteStep ? null : (
            <Button
              type="button"
              size={"icon-lg"}
              variant={"ghost"}
              onClick={() => {
                setDirection(-1);
                setStep("handle");
              }}
              disabled={activeStep === 1}
              className={"mt-2 size-10"}
            >
              <CaretLeftIcon weight="bold" className="size-7" />
            </Button>
          )}
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
              <input type="hidden" name="handle" value={handleValue} />
              {isCompleteStep ? null : (
                <aside className="mb-4">
                  <div className="font-medium text-muted-foreground tabular-nums">
                    Step {activeStep} of {steps.length}
                  </div>
                  <div className="text-foreground font-medium">
                    {activeStepItem?.label}
                  </div>
                </aside>
              )}
              <FieldSet>
                <Activity activeKey={step} direction={direction}>
                  {step === "handle" ? (
                    <div className="flex flex-col gap-4">
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
                                  autoComplete="off"
                                  autoFocus={step === "handle"}
                                  placeholder="Your handle"
                                  value={field.value ?? ""}
                                  onChange={(event) => {
                                    field.onChange(event.target.value);
                                    form.clearErrors("handle");
                                    form.clearErrors("root");
                                  }}
                                  className={cn(
                                    "peer ps-28.5 border-none h-12 text-base! rounded-xl"
                                  )}
                                />
                              </FormControl>
                              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-base! peer-disabled:opacity-50">
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
                        className={"h-11 text-base rounded-xl"}
                        onClick={() => void handleAdvanceToDetails()}
                        disabled={
                          !handleValue ||
                          isCheckingHandle ||
                          !!form.formState.errors.handle
                        }
                        aria-busy={isCheckingHandle}
                      >
                        Next
                      </Button>
                    </div>
                  ) : step === "details" ? (
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="mt-4 relative rounded-xl border border-input bg-input/20 outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-aria-invalid:border-destructive has-disabled:opacity-50 has-aria-invalid:ring-destructive/20 has-[input:is(:disabled)]:*:pointer-events-none dark:has-aria-invalid:ring-destructive/40">
                            <FormLabel className="block px-3 pt-2 text-sm text-foreground font-medium">
                              Title
                            </FormLabel>
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
                                className="px-3 pb-2 ps-4 h-12 text-base! rounded-xl bg-transparent border-none focus-visible:ring-0 aria-invalid:ring-0 dark:aria-invalid:ring-0"
                              />
                            </FormControl>
                            <FormMessage className="ml-4 mb-2"/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="mt-4 relative rounded-xl border border-input bg-input/20 outline-none transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-aria-invalid:border-destructive has-disabled:opacity-50 has-aria-invalid:ring-destructive/20 has-[input:is(:disabled)]:*:pointer-events-none dark:has-aria-invalid:ring-destructive/40">
                            <FormLabel className="block px-3 pt-2 text-sm text-foreground font-medium">
                              Bio
                            </FormLabel>
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
                                className="h-24 text-base! rounded-xl ps-4 bg-transparent border-none focus-visible:ring-0"
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
                          className={"w-full h-11 text-base rounded-xl"}
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
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="text-3xl font-semibold">
                        You&apos;re all set.
                      </div>
                      <p className="ml-1 text-base text-muted-foreground mb-4">
                        Your page is ready. You can visit it now.
                      </p>
                      <Button
                        type="button"
                        size="lg"
                        variant="brand"
                        className="h-11 text-base rounded-xl"
                        onClick={() => {
                          if (!completedHandle) {
                            return;
                          }
                          navigate(
                            getLocalizedPath(lang, `/user/${completedHandle}`)
                          );
                        }}
                        disabled={!completedHandle}
                      >
                        Go to Page
                      </Button>
                    </div>
                  )}
                </Activity>
              </FieldSet>
            </RouterForm>
          </RhfForm>
        </div>
      </section>
    </main>
  );
}

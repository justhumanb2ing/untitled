import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowsLeftRightIcon, CheckIcon } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "./ui/button";
import {
  Form as RhfForm,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverDescription,
  PopoverTitle,
  PopoverPanel,
  PopoverTrigger,
} from "./ui/popover";
import { Spinner } from "./ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { metadataConfig } from "@/config/metadata";
import { useLocalizedNavigate } from "@/hooks/use-localized-navigate";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const handleSchema = z.object({
  handle: z
    .string()
    .transform((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    )
    .refine((value) => value.length > 0, "Handle is required."),
});

type HandleFormValues = z.infer<typeof handleSchema>;

interface ChangeHandleFormPopoverProps {
  handle?: string;
}

export default function ChangeHandleFormPopover({
  handle,
}: ChangeHandleFormPopoverProps) {
  const localizedNavigate = useLocalizedNavigate();
  const [isHandlePopoverOpen, setIsHandlePopoverOpen] = useState(false);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false);
  const supabase = getSupabaseClient();
  const currentHandleValue = handle?.replace(/^@/, "") ?? "";
  const canChangeHandle = Boolean(handle);

  const form = useForm<HandleFormValues>({
    resolver: zodResolver(handleSchema),
    defaultValues: { handle: currentHandleValue },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const handleValue = form.watch("handle") ?? "";
  const rootError = form.formState.errors.root?.message;
  const isSaving = isCheckingHandle || isUpdatingHandle;

  useEffect(() => {
    form.reset({ handle: currentHandleValue });
  }, [currentHandleValue, form]);

  const checkHandleAvailability = async () => {
    if (isCheckingHandle || isUpdatingHandle) {
      return false;
    }

    const isHandleValid = await form.trigger("handle");
    if (!isHandleValid) {
      return false;
    }

    if (!supabase) {
      form.setError("handle", {
        type: "manual",
        message: "Handle validation is unavailable.",
      });
      return false;
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
      return false;
    }

    if (data) {
      form.setError("handle", {
        type: "manual",
        message: "Handle already exists.",
      });
      return false;
    }

    return true;
  };

  const submitHandleChange = form.handleSubmit(async () => {
    form.clearErrors("root");

    if (!handle) {
      form.setError("root", {
        type: "manual",
        message: "Handle update is unavailable.",
      });
      return;
    }

    const isAvailable = await checkHandleAvailability();
    if (!isAvailable) {
      return;
    }

    setIsUpdatingHandle(true);
    const sanitizedHandle = form.getValues("handle");

    try {
      const { error } = await (
        await supabase
      )
        .from("pages")
        .update({ handle: `@${sanitizedHandle}` })
        .eq("handle", handle);

      if (error) {
        form.setError("root", {
          type: "server",
          message: error.message,
        });
        return;
      }

      setIsHandlePopoverOpen(false);
      localizedNavigate(`/user/@${sanitizedHandle}`);
    } finally {
      setIsUpdatingHandle(false);
    }
  });

  return (
    <Popover
      open={isHandlePopoverOpen}
      onOpenChange={(nextOpen) => {
        if (!canChangeHandle && nextOpen) {
          return;
        }

        setIsHandlePopoverOpen(nextOpen);

        if (nextOpen) {
          form.clearErrors();
          return;
        }

        form.reset({ handle: currentHandleValue });
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant={"ghost"}
                  size={"icon-lg"}
                  aria-label="Change Handle"
                  disabled={!canChangeHandle}
                >
                  <ArrowsLeftRightIcon weight="regular" className="size-4" />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="bottom" sideOffset={8}>
          <p>Change Handle</p>
        </TooltipContent>
      </Tooltip>
      <PopoverPanel
        side="bottom"
        sideOffset={12}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
        }}
        className="w-84 rounded-3xl p-6 gap-0 ring-secondary"
      >
        <PopoverTitle className={"font-medium"}>Change handle</PopoverTitle>
        <PopoverDescription className={"text-muted-foreground text-sm"}>
          Choose a unique handle for your page.
        </PopoverDescription>
        <RhfForm {...form}>
          <form className="space-y-3" onSubmit={submitHandleChange}>
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
                        autoComplete="off"
                        autoFocus
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
                        className={cn("peer ps-29 border-none h-10 text-base!")}
                      />
                    </FormControl>
                    <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground text-base! peer-disabled:opacity-50">
                      {metadataConfig.handle}/@
                    </span>
                  </div>
                  <FormDescription className="flex items-center gap-1">
                    <CheckIcon />
                    <span className="text-xs">
                      Only lowercase letters and numbers are allowed.
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {rootError ? (
              <p className="text-destructive text-sm" role="alert">
                {rootError}
              </p>
            ) : null}
            <Button
              className="w-full text-base h-10"
              size="lg"
              type="submit"
              variant="brand"
              disabled={!handleValue || isSaving}
              aria-busy={isSaving}
              data-icon={isUpdatingHandle ? "inline-start" : undefined}
            >
              {isUpdatingHandle ? <Spinner /> : "Update"}
            </Button>
          </form>
        </RhfForm>
      </PopoverPanel>
    </Popover>
  );
}

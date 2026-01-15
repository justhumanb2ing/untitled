import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";
import { DotsThreeIcon, ImageSquareIcon, XIcon } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverPanel, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "../ui/button";
import EditableParagraph from "./editable-paragraph";
import { usePageAutoSaveActions } from "@/hooks/page/use-page-auto-save-controller";
import { usePageImageUploader } from "@/hooks/use-page-image-uploader";
import VisibilityToggle from "./visibility-toggle";
import { toastManager } from "@/components/ui/toast";
import { getMediaValidationError } from "../../../service/pages/page-grid";
import { Separator } from "../ui/separator";
import {
  createUmamiAttemptId,
  getUmamiEventAttributes,
  trackUmamiEvent,
} from "@/lib/umami";
import { UMAMI_EVENTS, UMAMI_PROP_KEYS } from "@/lib/umami-events";
import ProfileImageOptionDrawer from "./profile-image-option-drawer";

const profileHeaderSchema = z.object({
  image_url: z
    .file()
    .mime(["image/jpeg", "image/png", "image/gif", "image/webp"])
    .max(2_000_000)
    .nullable(),
  title: z.string().trim().min(1, "Title is required.").nullable(),
  description: z.string().trim().nullable(),
});

type ProfileHeaderFormValues = z.infer<typeof profileHeaderSchema>;

interface ProfileHeaderEditorProps {
  pageId: string;
  userId: string;
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  handle: string;
  isOwner: boolean;
  isMobilePreview: boolean;
  isPublic: boolean;
}

interface ProfileHeaderFormProps {
  form: UseFormReturn<ProfileHeaderFormValues>;
  pageId: string;
  isPublic: boolean;
  isReadOnly: boolean;
  isMobilePreview: boolean;
  handle: string;
  title: string | null;
  resolvedImageUrl: string;
  hasImage: boolean;
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  imageInputRef: RefObject<HTMLInputElement | null>;
  handleRemoveImage: () => void;
  onSubmit: () => void;
}

export default function ProfileHeaderEditor({
  pageId,
  userId,
  imageUrl,
  title,
  description,
  handle,
  isOwner,
  isMobilePreview,
  isPublic,
}: ProfileHeaderEditorProps) {
  const updateDraft = usePageAutoSaveActions((actions) => actions.updateDraft);
  const markDirty = usePageAutoSaveActions((actions) => actions.markDirty);
  const markError = usePageAutoSaveActions((actions) => actions.markError);
  const uploadPageImage = usePageImageUploader();
  const form = useForm<ProfileHeaderFormValues>({
    resolver: zodResolver(profileHeaderSchema),
    defaultValues: {
      image_url: null,
      title: title ?? null,
      description: description ?? null,
    },
    mode: "onChange",
  });

  const imageValue = form.watch("image_url");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImageCleared, setIsImageCleared] = useState(false);
  const existingImageUrl = imageUrl?.trim() ?? "";
  const resolvedImageUrl = isImageCleared
    ? ""
    : (previewUrl ?? existingImageUrl);
  const hasImage = resolvedImageUrl.length > 0;
  const isReadOnly = !isOwner;
  const titlePlaceholder = isReadOnly ? "" : "Add a title";
  const descriptionPlaceholder = isReadOnly ? "" : "Add a bio";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadRequestIdRef = useRef(0);
  const handleSubmit = form.handleSubmit(() => undefined);

  const handleRemoveImage = () => {
    if (isReadOnly) {
      return;
    }

    uploadRequestIdRef.current += 1;
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsImageCleared(true);
    form.setValue("image_url", null, { shouldValidate: true });
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    markDirty();
    updateDraft({ image_url: null });
  };

  useEffect(() => {
    if (existingImageUrl.length > 0) {
      setIsImageCleared(false);
    }
  }, [existingImageUrl]);

  useEffect(() => {
    if (!(imageValue instanceof File)) {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      return;
    }

    if (isReadOnly) {
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    let attemptId: string | null = null;
    const requestId = (uploadRequestIdRef.current += 1);

    const runUpload = async () => {
      const isValid = await form.trigger("image_url");
      if (!isValid || cancelled || requestId !== uploadRequestIdRef.current) {
        return;
      }

      attemptId = createUmamiAttemptId("profile-image");
      trackUmamiEvent(
        UMAMI_EVENTS.feature.profileImage.upload,
        {
          [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
          [UMAMI_PROP_KEYS.ctx.pageId]: pageId,
          [UMAMI_PROP_KEYS.ctx.action]: "start",
        },
        {
          dedupeKey: `profile-image-upload:${attemptId}`,
          once: true,
        }
      );

      objectUrl = URL.createObjectURL(imageValue);
      setPreviewUrl(objectUrl);
      setIsImageCleared(false);
      markDirty();

      try {
        const { publicUrl } = await uploadPageImage({
          pageId,
          userId,
          file: imageValue,
        });

        if (cancelled || requestId !== uploadRequestIdRef.current) {
          return;
        }

        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }

        setPreviewUrl(publicUrl);
        updateDraft({ image_url: publicUrl });
        if (attemptId) {
          trackUmamiEvent(
            UMAMI_EVENTS.feature.profileImage.success,
            {
              [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
              [UMAMI_PROP_KEYS.ctx.pageId]: pageId,
            },
            {
              dedupeKey: `profile-image-success:${attemptId}`,
              once: true,
            }
          );
        }
      } catch (error) {
        if (!cancelled && requestId === uploadRequestIdRef.current) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          setPreviewUrl(null);
          markError();
          if (attemptId) {
            trackUmamiEvent(
              UMAMI_EVENTS.feature.profileImage.error,
              {
                [UMAMI_PROP_KEYS.ctx.attemptId]: attemptId,
                [UMAMI_PROP_KEYS.ctx.pageId]: pageId,
                [UMAMI_PROP_KEYS.ctx.errorCode]: "upload_failed",
              },
              {
                dedupeKey: `profile-image-error:${attemptId}`,
                once: true,
              }
            );
          }
        }
      }
    };

    void runUpload();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    imageValue,
    isReadOnly,
    form,
    pageId,
    updateDraft,
    markDirty,
    markError,
    uploadPageImage,
  ]);

  useEffect(() => {
    if (isReadOnly) {
      return;
    }

    const subscription = form.watch((values) => {
      updateDraft({
        title: values.title ?? "",
        description: values.description ?? null,
      });
    });

    return () => subscription.unsubscribe();
  }, [form, isReadOnly, updateDraft]);

  return (
    <>
      {/* <LegacyProfileHeaderForm
        form={form}
        pageId={pageId}
        isPublic={isPublic}
        isReadOnly={isReadOnly}
        isMobilePreview={isMobilePreview}
        handle={handle}
        title={title}
        resolvedImageUrl={resolvedImageUrl}
        hasImage={hasImage}
        titlePlaceholder={titlePlaceholder}
        descriptionPlaceholder={descriptionPlaceholder}
        imageInputRef={imageInputRef}
        handleRemoveImage={handleRemoveImage}
        onSubmit={handleSubmit}
      /> */}
      <ProfileHeaderCardForm
        form={form}
        pageId={pageId}
        isPublic={isPublic}
        isReadOnly={isReadOnly}
        isMobilePreview={isMobilePreview}
        handle={handle}
        title={title}
        resolvedImageUrl={resolvedImageUrl}
        hasImage={hasImage}
        titlePlaceholder={titlePlaceholder}
        descriptionPlaceholder={descriptionPlaceholder}
        imageInputRef={imageInputRef}
        handleRemoveImage={handleRemoveImage}
        onSubmit={handleSubmit}
      />
    </>
  );
}

function LegacyProfileHeaderForm({
  form,
  isReadOnly,
  isMobilePreview,
  handle,
  title,
  resolvedImageUrl,
  hasImage,
  titlePlaceholder,
  descriptionPlaceholder,
  imageInputRef,
  handleRemoveImage,
  onSubmit,
}: ProfileHeaderFormProps) {
  const handleSelectImage = () => imageInputRef.current?.click();
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const handleUploadClick = () => {
    setIsImagePopoverOpen(false);
    handleSelectImage();
  };
  const handleRemoveClick = () => {
    setIsImagePopoverOpen(false);
    handleRemoveImage();
  };

  return (
    <Form {...form}>
      <form
        className="flex w-full flex-col justify-center gap-2 px-4 xl:gap-4"
        onSubmit={onSubmit}
      >
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem className="gap-2 mb-4">
              <div className="relative inline-flex group w-fit">
                <Button
                  type="button"
                  variant={"secondary"}
                  className={cn(
                    "relative aspect-square size-30 overflow-hidden rounded-full p-0 disabled:opacity-100",
                    isMobilePreview ? "size-30" : "xl:size-46"
                  )}
                  disabled={isReadOnly}
                >
                  {hasImage && (
                    <img
                      src={resolvedImageUrl}
                      alt={""}
                      className="absolute inset-0 h-full w-full object-cover transition-all hover:grayscale-25"
                    />
                  )}
                  <span className={cn("sr-only")}>{handle}</span>
                </Button>
                {!isReadOnly && (
                  <Popover
                    open={isImagePopoverOpen}
                    onOpenChange={setIsImagePopoverOpen}
                  >
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-lg"
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md hover:bg-input"
                          aria-label="Profile image actions"
                        >
                          <DotsThreeIcon className="size-5" weight="bold" />
                        </Button>
                      }
                    />
                    <PopoverPanel
                      side="bottom"
                      align="center"
                      sideOffset={12}
                      className="w-52 p-2"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          onClick={handleUploadClick}
                        >
                          <ImageSquareIcon className="size-4" />
                          Upload image
                        </Button>
                        {hasImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                            onClick={handleRemoveClick}
                          >
                            <XIcon className="size-4" weight="bold" />
                            Remove image
                          </Button>
                        )}
                      </div>
                    </PopoverPanel>
                  </Popover>
                )}
              </div>
              <FormControl>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  name={field.name}
                  onBlur={field.onBlur}
                  className="sr-only"
                  onChange={(event) =>
                    handleProfileImageInputChange(event, field.onChange)
                  }
                  disabled={isReadOnly}
                  aria-disabled={isReadOnly}
                />
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="w-full max-w-xl xl:mb-2">
              <FormControl>
                <EditableParagraph
                  value={field.value}
                  onValueChange={field.onChange}
                  onValueBlur={field.onBlur}
                  readOnly={isReadOnly}
                  placeholder={titlePlaceholder}
                  ariaLabel="Profile title"
                  className={cn(
                    "text-3xl font-bold tracking-tight py-1",
                    isMobilePreview ? "text-3xl" : "xl:text-4xl",
                    isReadOnly && "truncate"
                  )}
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
            <FormItem className="w-full max-w-2xl">
              <FormControl>
                <EditableParagraph
                  value={field.value}
                  onValueChange={field.onChange}
                  onValueBlur={field.onBlur}
                  readOnly={isReadOnly}
                  placeholder={descriptionPlaceholder}
                  ariaLabel="Profile description"
                  multiline
                  className={cn(
                    "text-base leading-relaxed font-light text-primary tracking-widest",
                    isMobilePreview ? "text-base" : "xl:text-lg",
                    isReadOnly && "truncate"
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function ProfileHeaderCardForm({
  form,
  pageId,
  isPublic,
  isReadOnly,
  isMobilePreview,
  handle,
  title,
  resolvedImageUrl,
  hasImage,
  titlePlaceholder,
  descriptionPlaceholder,
  imageInputRef,
  handleRemoveImage,
  onSubmit,
}: ProfileHeaderFormProps) {
  return (
    <Form {...form}>
      <form
        className={cn(
          "w-full items-center gap-6 h-full max-h-full relative",
          !isMobilePreview && "xl:items-start xl:gap-8 xl:h-full"
        )}
        onSubmit={onSubmit}
      >
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem
              className={cn(
                "w-full h-full max-h-full",
                !isMobilePreview && "xl:h-full xl:max-h-full"
              )}
            >
              {/* Image */}
              <div
                className={cn(
                  "relative overflow-hidden bg-neutral-900/10 h-full"
                )}
              >
                {hasImage ? (
                  <img
                    src={resolvedImageUrl}
                    alt={title ?? handle ?? "Profile image"}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-br from-neutral-900 via-neutral-700/70 to-neutral-950" />
                )}

                {/* Multi-layer gradient overlay - refined for mobile app feel */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0",
                    "bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.1)_70%,transparent_100%)]"
                  )}
                />

                <div className="pointer-events-none absolute right-0 inset-y-0 bottom-0 h-full w-1/7 dark:bg-linear-to-l dark:from-background dark:via-70% dark:to-transparent" />

                {!isReadOnly && (
                  <div className="absolute right-4 top-4">
                    <ProfileImageOptionDrawer
                      imageRef={imageInputRef}
                      pageId={pageId}
                      isVisible={isPublic}
                      hasImage={hasImage}
                      onRemoveImage={handleRemoveImage}
                    />
                  </div>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                name={field.name}
                onBlur={field.onBlur}
                className="sr-only hidden"
                onChange={(event) =>
                  handleProfileImageInputChange(event, field.onChange)
                }
                disabled={isReadOnly}
                aria-disabled={isReadOnly}
              />
            </FormItem>
          )}
        />
        {/* Text container - bold typography like reference image */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 flex flex-col gap-1 px-5 pb-6",
            !isMobilePreview && "xl:px-6 xl:pb-8"
          )}
        >
          <div className="relative z-10 w-full flex flex-col gap-1.5">
            <FormField
              control={form.control}
              name="title"
              render={({ field: titleField }) => (
                <FormItem className="w-full text-left">
                  <FormControl>
                    <EditableParagraph
                      value={titleField.value}
                      onValueChange={titleField.onChange}
                      onValueBlur={titleField.onBlur}
                      readOnly={isReadOnly}
                      placeholder={titlePlaceholder}
                      ariaLabel="Profile title"
                      className={cn(
                        "font-semibold tracking-[-0.02em] leading-[1.1] text-white",
                        "drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]",
                        "data-[empty=true]:before:text-white/40",
                        "text-3xl",
                        !isMobilePreview && "xl:text-4xl",
                        isReadOnly && "truncate"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field: descriptionField }) => (
                <FormItem className="w-full text-left">
                  <FormControl>
                    <EditableParagraph
                      value={descriptionField.value}
                      onValueChange={descriptionField.onChange}
                      onValueBlur={descriptionField.onBlur}
                      readOnly={isReadOnly}
                      placeholder={descriptionPlaceholder}
                      ariaLabel="Profile description"
                      multiline
                      className={cn(
                        "font-light tracking-wide leading-relaxed text-white/85 line-clamp-2",
                        "data-[empty=true]:before:text-white/40",
                        "text-sm",
                        !isMobilePreview && "xl:text-base",
                        isReadOnly && "truncate"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}

function handleProfileImageInputChange(
  event: ChangeEvent<HTMLInputElement>,
  onChange: (value: File | null) => void
) {
  const file = event.currentTarget.files?.[0] ?? null;

  if (file) {
    const validationError = getMediaValidationError(file);
    if (validationError) {
      toastManager.add({
        type: "error",
        title: "Upload blocked",
        description: validationError,
      });
      event.currentTarget.value = "";
      return;
    }
  }

  onChange(file);
}

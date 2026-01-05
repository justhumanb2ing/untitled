import { useEffect, useRef, useState, type RefObject } from "react";
import {
  DotsThreeIcon,
  ImageSquareIcon,
  SealCheckIcon,
  XIcon,
} from "@phosphor-icons/react";
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
import { Button } from "./ui/button";
import EditableParagraph from "./editable-paragraph";
import { usePageAutoSaveActions } from "@/components/page-auto-save-controller";
import { usePageImageUploader } from "@/hooks/use-page-image-uploader";
import VisibilityToggle from "./visibility-toggle";

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
  imageUrl,
  title,
  description,
  handle,
  isOwner,
  isMobilePreview,
  isPublic,
}: ProfileHeaderEditorProps) {
  const { updateDraft, markDirty, markError } = usePageAutoSaveActions();
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
    const requestId = (uploadRequestIdRef.current += 1);

    const runUpload = async () => {
      const isValid = await form.trigger("image_url");
      if (!isValid || cancelled || requestId !== uploadRequestIdRef.current) {
        return;
      }

      objectUrl = URL.createObjectURL(imageValue);
      setPreviewUrl(objectUrl);
      setIsImageCleared(false);
      markDirty();

      try {
        const { publicUrl } = await uploadPageImage({
          pageId,
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
      } catch (error) {
        if (!cancelled && requestId === uploadRequestIdRef.current) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          setPreviewUrl(null);
          markError();
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
                          className="hover:bg-secondary absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
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
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    field.onChange(file);
                  }}
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
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const handleUploadClick = () => {
    setIsImagePopoverOpen(false);
    handleSelectImage();
  };
  const handleRemoveClick = () => {
    setIsImagePopoverOpen(false);
    handleRemoveImage();
  };

  const handleSelectImage = () => imageInputRef.current?.click();

  return (
    <div>
      <Form {...form}>
        <form
          className={cn(
            "flex w-full flex-col items-center gap-6",
            isMobilePreview ? "gap-6" : "xl:items-start xl:gap-8"
          )}
          onSubmit={onSubmit}
        >
          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem className="w-full">
                <div className={cn("relative w-full mx-auto max-w-lg")}>
                  <div
                    className={cn(
                      "relative overflow-hidden xl:rounded-t-[28px] bg-neutral-900/10",
                      isMobilePreview ? "aspect-4/5" : "aspect-5/6"
                    )}
                  >
                    {!hasImage && (
                      <div className="absolute inset-0 bg-linear-to-br from-neutral-900 via-neutral-700/70 to-neutral-950" />
                    )}
                    {hasImage && (
                      <img
                        src={resolvedImageUrl}
                        alt={title ?? handle ?? "Profile image"}
                        className="absolute inset-0 h-full w-full object-cover grayscale-12 contrast-110"
                      />
                    )}
                    {/* bottom fade */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-background via-60% to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-6 pb-8 text-center text-white">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field: titleField }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <EditableParagraph
                                value={titleField.value}
                                onValueChange={titleField.onChange}
                                onValueBlur={titleField.onBlur}
                                readOnly={isReadOnly}
                                placeholder={titlePlaceholder}
                                ariaLabel="Profile title"
                                className={cn(
                                  "text-foreground text-2xl font-semibold tracking-tight data-[empty=true]:before:text-background/50 data-[empty=true]:before:justify-center",
                                  isMobilePreview ? "text-2xl" : "xl:text-3xl",
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
                          <FormItem className="w-full">
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
                                  "text-base font-light leading-relaxed text-foreground/80 line-clamp-3 data-[empty=true]:before:text-background/50 data-[empty=true]:before:justify-center",
                                  isMobilePreview ? "text-base" : "xl:text-lg",
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
                  {!isReadOnly && (
                    <div className="absolute right-4 top-4">
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
                              className="rounded-full shadow-[0_10px_25px_-15px_rgba(0,0,0,0.7)]"
                              aria-label="Profile image actions"
                            >
                              <DotsThreeIcon className="size-5" weight="bold" />
                            </Button>
                          }
                        />
                        <PopoverPanel
                          side="bottom"
                          align="end"
                          sideOffset={12}
                          className="w-52 p-2 rounded-xl"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full justify-start gap-2 text-sm py-4.5"
                              onClick={handleUploadClick}
                            >
                              <ImageSquareIcon className="size-4" />
                              Upload image
                            </Button>
                            {hasImage && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start gap-2 text-sm py-4.5 text-destructive hover:text-destructive"
                                onClick={handleRemoveClick}
                              >
                                <XIcon className="size-4" weight="bold" />
                                Remove image
                              </Button>
                            )}
                          </div>
                        </PopoverPanel>
                      </Popover>
                    </div>
                  )}
                  {!isReadOnly && (
                    <div
                      className={cn(
                        "absolute top-4.5 right-16",
                        isMobilePreview ? "block" : ""
                      )}
                    >
                      <VisibilityToggle pageId={pageId} isPublic={isPublic} />
                    </div>
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
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      field.onChange(file);
                    }}
                    disabled={isReadOnly}
                    aria-disabled={isReadOnly}
                  />
                </FormControl>
                <FormMessage className="text-center" />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

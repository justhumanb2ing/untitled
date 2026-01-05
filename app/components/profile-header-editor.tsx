import { useEffect, useRef, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "./ui/button";
import EditableParagraph from "./editable-paragraph";
import { usePageAutoSaveActions } from "@/components/page-auto-save-controller";
import { usePageImageUploader } from "@/hooks/use-page-image-uploader";

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
}

export default function ProfileHeaderEditor({
  pageId,
  imageUrl,
  title,
  description,
  handle,
  isOwner,
  isMobilePreview,
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
    <Form {...form}>
      <form
        className="flex w-full flex-col justify-center gap-2 px-4 xl:gap-4"
        onSubmit={handleSubmit}
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
                  onClick={() => imageInputRef.current?.click()}
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
                {!isReadOnly && hasImage && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-lg"
                    className="hover:bg-secondary absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 rounded-full shadow-md"
                    onClick={handleRemoveImage}
                    aria-label="Remove profile image"
                  >
                    <XIcon className="size-5" weight="bold" />
                  </Button>
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

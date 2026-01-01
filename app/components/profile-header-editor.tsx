import { useEffect, useRef, useState } from "react";
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
}

export default function ProfileHeaderEditor({
  pageId,
  imageUrl,
  title,
  description,
  handle,
  isOwner,
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
  const existingImageUrl = imageUrl?.trim() ?? "";
  const resolvedImageUrl = previewUrl ?? existingImageUrl;
  const hasImage = resolvedImageUrl.length > 0;
  const isReadOnly = !isOwner;
  const titlePlaceholder = isReadOnly ? "" : "Add a title";
  const descriptionPlaceholder = isReadOnly ? "" : "Add a bio";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadRequestIdRef = useRef(0);
  const handleSubmit = form.handleSubmit(() => undefined);

  useEffect(() => {
    if (!(imageValue instanceof File)) {
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
        className="flex w-full flex-col justify-center gap-4 px-4"
        onSubmit={handleSubmit}
      >
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem className="gap-2 mb-8">
              <Button
                type="button"
                variant={"secondary"}
                className="relative aspect-square size-40 overflow-hidden rounded-full p-0"
                onClick={() => imageInputRef.current?.click()}
                disabled={isReadOnly}
              >
                {hasImage && (
                  <img
                    src={resolvedImageUrl}
                    alt={handle}
                    className="absolute inset-0 h-full w-full object-cover transition-all hover:grayscale-25"
                  />
                )}
                <span className={cn("sr-only")}>{handle}</span>
              </Button>
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
            <FormItem className="w-full max-w-xl">
              <FormControl>
                <EditableParagraph
                  value={field.value}
                  onValueChange={field.onChange}
                  onValueBlur={field.onBlur}
                  readOnly={isReadOnly}
                  placeholder={titlePlaceholder}
                  ariaLabel="Profile title"
                  className="text-3xl font-bold tracking-wider line-clamp-3 truncate"
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
                  className="text-lg leading-relaxed line-clamp-5 truncate font-light"
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

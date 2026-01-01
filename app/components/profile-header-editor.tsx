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
  imageUrl: string | null;
  title: string | null;
  description: string | null;
  handle: string;
  isOwner: boolean;
}

export default function ProfileHeaderEditor({
  imageUrl,
  title,
  description,
  handle,
  isOwner,
}: ProfileHeaderEditorProps) {
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
  const descriptionPlaceholder = isReadOnly ? "" : "Add a description";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handleSubmit = form.handleSubmit(() => undefined);

  useEffect(() => {
    if (!(imageValue instanceof File)) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageValue);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageValue]);

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
                className="relative aspect-square size-40 overflow-hidden rounded-full"
                onClick={() => imageInputRef.current?.click()}
                disabled={isReadOnly}
              >
                {hasImage && (
                  <img
                    src={resolvedImageUrl}
                    alt={handle}
                    className="w-full h-full object-cover"
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
                  className="text-lg leading-relaxed line-clamp-5 truncate"
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

import { useEffect, useRef, useState } from "react";
import { LockIcon, LockOpenIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

import { getSupabaseClient } from "@/lib/supabase";
import { Button } from "./ui/button";

interface VisibilityToggleProps {
  pageId: string;
  isPublic: boolean;
}

export default function VisibilityToggle({
  pageId,
  isPublic: initialIsPublic,
}: VisibilityToggleProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = getSupabaseClient();
  const isPublicRef = useRef(initialIsPublic);

  useEffect(() => {
    setIsPublic(initialIsPublic);
    isPublicRef.current = initialIsPublic;
  }, [initialIsPublic]);

  const handleToggle = async () => {
    if (isSaving) {
      return;
    }

    const nextIsPublic = !isPublicRef.current;
    setIsPublic(nextIsPublic);
    isPublicRef.current = nextIsPublic;
    setIsSaving(true);

    try {
      const { error } = await (await supabase)
        .from("pages")
        .update({ is_public: nextIsPublic })
        .eq("id", pageId);

      if (error) {
        setIsPublic(!nextIsPublic);
        isPublicRef.current = !nextIsPublic;
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 min-w-36 overflow-hidden group"
      onClick={handleToggle}
      disabled={isSaving}
      aria-pressed={isPublic}
      aria-busy={isSaving}
    >
      <span className="sr-only">
        {isPublic ? "Public page" : "Private page"}
      </span>
      <span className="relative flex h-6 w-full items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} mode="sync">
          {isPublic ? (
            <motion.span
              key="public"
              className="absolute inset-0 flex items-center justify-center gap-2"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <LockOpenIcon className="size-4" />
              <span className="text-xs font-medium">Public handle</span>
            </motion.span>
          ) : (
            <motion.span
              key="private"
              className="absolute inset-0 flex items-center justify-center gap-2"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <LockIcon className="size-4" />
              <span className="text-xs font-medium">Private handle</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </Button>
  );
}

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";

interface EditableParagraphProps extends ComponentPropsWithoutRef<"p"> {
  value: string | null;
  onValueChange: (value: string) => void;
  onValueBlur: () => void;
  readOnly: boolean;
  placeholder: string;
  multiline?: boolean;
  ariaLabel: string;
}

export default function EditableParagraph({
  value,
  onValueChange,
  onValueBlur,
  readOnly,
  placeholder,
  className,
  multiline = false,
  ariaLabel,
  ...props
}: EditableParagraphProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const normalizedValue = value ?? "";
  const isEmpty = normalizedValue.trim().length === 0;

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (ref.current.textContent !== normalizedValue) {
      ref.current.textContent = normalizedValue;
    }
  }, [normalizedValue]);

  const handleInput = (event: FormEvent<HTMLParagraphElement>) => {
    onValueChange(event.currentTarget.textContent ?? "");
  };

  const handleBlur = (event: FocusEvent<HTMLParagraphElement>) => {
    onValueChange(event.currentTarget.textContent ?? "");
    onValueBlur();
  };

  return (
    <p
      {...props}
      ref={ref}
      role="textbox"
      aria-multiline={multiline}
      aria-label={ariaLabel}
      aria-readonly={readOnly}
      data-empty={isEmpty}
      data-placeholder={placeholder}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      className={cn(
        "relative w-full whitespace-pre-wrap wrap-break-word outline-none focus-visible:ring-0",
        "data-[empty=true]:before:absolute data-[empty=true]:before:inset-0 data-[empty=true]:before:flex data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]",
        readOnly ? "cursor-default" : "cursor-text",
        className
      )}
    />
  );
}

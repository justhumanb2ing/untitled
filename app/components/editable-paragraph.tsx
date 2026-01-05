import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ClipboardEvent,
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
  maxLength?: number;
  onLimitReached?: (maxLength: number) => void;
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
  maxLength,
  onLimitReached,
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

  const getSelectionLength = () => {
    if (typeof window === "undefined") {
      return 0;
    }
    const selection = window.getSelection();
    return selection ? selection.toString().length : 0;
  };

  const handleBeforeInput = (event: FormEvent<HTMLParagraphElement>) => {
    if (readOnly || maxLength === undefined) {
      return;
    }
    const nativeEvent = event.nativeEvent as InputEvent;
    if (!nativeEvent.inputType?.startsWith("insert")) {
      return;
    }
    const incomingText = nativeEvent.data ?? "";
    const incomingLength =
      incomingText.length ||
      (nativeEvent.inputType === "insertParagraph" ||
      nativeEvent.inputType === "insertLineBreak"
        ? 1
        : 0);
    if (incomingLength === 0) {
      return;
    }
    const currentText = ref.current?.textContent ?? "";
    const selectionLength = getSelectionLength();
    if (currentText.length - selectionLength + incomingLength > maxLength) {
      event.preventDefault();
      onLimitReached?.(maxLength);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLParagraphElement>) => {
    if (readOnly || maxLength === undefined) {
      return;
    }
    const pasteText = event.clipboardData?.getData("text") ?? "";
    if (pasteText.length === 0) {
      return;
    }
    const currentText = ref.current?.textContent ?? "";
    const selectionLength = getSelectionLength();
    if (currentText.length - selectionLength + pasteText.length > maxLength) {
      event.preventDefault();
      onLimitReached?.(maxLength);
    }
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
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      className={cn(
        "relative w-full min-w-0 whitespace-pre-wrap wrap-break-word outline-none focus-visible:ring-0",
        "data-[empty=true]:before:absolute data-[empty=true]:before:inset-0 data-[empty=true]:before:flex data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]",
        readOnly ? "cursor-default" : "cursor-text",
        className
      )}
    />
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useIntlayer } from "react-intlayer";

import { cn } from "@/lib/utils";
import { MoonStarsIcon, SunDimIcon } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
  iconSize?: string;
}

export const ThemeToggle = ({
  className,
  duration = 400,
  iconSize,
  ...props
}: ThemeTogglerProps) => {
  const [isDark, setIsDark] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { themeTooltip } = useIntlayer("themeToggle");

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    try {
      const storedTheme = localStorage.getItem("theme");
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (storedTheme === "light") {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // ignore storage access errors (privacy modes, disabled storage)
    }

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(async () => {
    if (!buttonRef.current) return;

    await document.startViewTransition(() => {
      flushSync(() => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", newTheme ? "dark" : "light");
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(left, window.innerWidth - left),
      Math.max(top, window.innerHeight - top)
    );

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, [isDark, duration]);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            ref={buttonRef}
            onClick={toggleTheme}
            className={cn(
              "rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50",
              className
            )}
            {...props}
          >
            {isDark ? (
              <SunDimIcon className={iconSize} />
            ) : (
              <MoonStarsIcon className={iconSize} />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>
        }
      />
      <TooltipContent side="bottom" sideOffset={12}>
        <p>{themeTooltip.value}</p>
      </TooltipContent>
    </Tooltip>
  );
};

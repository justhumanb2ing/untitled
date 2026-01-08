import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui/input";
import { Popover, PopoverPanel, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
};

type Props = {
  onSelect: (center: [number, number]) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

// TODO: locale에 따라서, place_name_en 또는 place_name_ko 결과에 출력하도록
export function MapSearch({ onSelect, isOpen, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleClearInput = () => {
    setQuery("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSelectQueryItem = (
    center: [number, number],
    placeName: string
  ) => {
    onSelect(center);
    setQuery(placeName);
    setResults([]);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
            query
          )}&access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&language=ko,en&limit=5&autocomplete=true&types=country,place&format=v5`,
          { signal: controller.signal }
        );

        const json = await res.json();

        setResults(json.features ?? []);
      } catch {
        // ignore abort
      } finally {
        setLoading(false);
      }
    }, 500); // debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Popover open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon-lg"
            variant={isOpen ? "brand" : "ghost"}
            className={cn(
              "rounded-lg transition-colors focus-visible:z-10",
              isOpen ? "text-white" : "hover:bg-white/10"
            )}
            aria-pressed={isOpen}
          >
            <motion.p whileTap={{ scale: 0.8 }}>
              <MagnifyingGlassIcon
                weight="bold"
                className="size-4 text-white"
              />
            </motion.p>
          </Button>
        }
      />
      <PopoverPanel
        side="bottom"
        sideOffset={12}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28,
        }}
        className="w-60 rounded-lg p-1 gap-0 bg-black text-white"
      >
        <div className="relative">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Location"
            autoFocus
            autoComplete="off"
            className="w-full rounded-md h-8 pe-9 focus-visible:border-0 focus-visible:ring-0 bg-[#e5e5e5]/20"
          />
          {query && (
            <button
              aria-label="Clear input"
              className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground focus:z-10 focus-visible:border-0 focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleClearInput}
              type="button"
            >
              <XIcon aria-hidden="true" weight="bold" className="size-3" />
            </button>
          )}
        </div>

        {results.length > 0 && (
          <ul className="z-10 mt-1.5 text-xs flex flex-col gap-0.5">
            {results.map((r) => (
              <Button
                key={r.id}
                variant={"ghost"}
                size={"sm"}
                onClick={() => handleSelectQueryItem(r.center, r.place_name)}
                className={
                  "rounded-sm justify-start py-3.5 hover:bg-[#e5e5e5]/20 hover:text-white font-normal "
                }
              >
                <li>{r.place_name}</li>
              </Button>
            ))}
          </ul>
        )}
      </PopoverPanel>
    </Popover>
  );
}

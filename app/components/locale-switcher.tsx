import { getLocaleName, getLocalizedUrl, getPathWithoutLocale } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";
import { useLocation, useNavigate } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function LocaleSwitcher() {
  const { localeLabel } = useIntlayer("locale");
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { availableLocales, locale, setLocale } = useLocale();

  const pathWithoutLocale = getPathWithoutLocale(pathname);

  return (
    <Tooltip>
      <Select
        value={locale ?? null}
        onValueChange={(nextLocale) => {
          if (!nextLocale || nextLocale === locale) return;

          setLocale(nextLocale);
          navigate(getLocalizedUrl(pathWithoutLocale, nextLocale));
        }}
      >
        <TooltipTrigger
          render={(props) => (
            <SelectTrigger
              {...props}
              size="sm"
              aria-label={localeLabel.value}
              className={"border-none bg-background hover:bg-muted rounded-md"}
            >
              <SelectValue>
                {(value) =>
                  typeof value === "string" ? getLocaleName(value) : localeLabel
                }
              </SelectValue>
            </SelectTrigger>
          )}
        />
        <SelectContent side="bottom" className={"p-2 shadow-xs"}>
          {availableLocales.map((localeItem) => {
            const label = getLocaleName(localeItem);

            return (
              <SelectItem
                key={localeItem}
                value={localeItem}
                aria-label={`${localeLabel}: ${label}`}
              >
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <TooltipContent side="bottom" sideOffset={12}>
        Language
      </TooltipContent>
    </Tooltip>
  );
}

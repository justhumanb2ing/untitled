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

export default function LocaleSwitcher() {
  const { localeLabel } = useIntlayer('locale');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { availableLocales, locale, setLocale } = useLocale();

  const pathWithoutLocale = getPathWithoutLocale(pathname);

  return (
    <nav aria-label={localeLabel.value} className="flex justify-end">
      <Select
        value={locale ?? null}
        onValueChange={(nextLocale) => {
          if (!nextLocale || nextLocale === locale) return;

          setLocale(nextLocale);
          navigate(getLocalizedUrl(pathWithoutLocale, nextLocale));
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={localeLabel.value}
          className={"border-none bg-background hover:bg-muted rounded-md"}
        >
          <SelectValue>
            {(value) =>
              typeof value === "string"
                ? getLocaleName(value)
                : localeLabel
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" sideOffset={12} className={"p-2 shadow-xs"}>
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
    </nav>
  );
}

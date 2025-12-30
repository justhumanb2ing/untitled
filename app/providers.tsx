import React from "react";
import { IntlayerProvider } from "react-intlayer";
import { useI18nHTMLAttributes } from "./hooks/use-i18n-html-attributes";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useI18nHTMLAttributes();
  
  return <IntlayerProvider>{children}</IntlayerProvider>;
}

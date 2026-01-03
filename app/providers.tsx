import React from "react";
import { IntlayerProvider } from "react-intlayer";
import { useI18nHTMLAttributes } from "./hooks/use-i18n-html-attributes";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { useInitAmplitude } from "./hooks/use-init-amplitude";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useI18nHTMLAttributes();
  useInitAmplitude();

  return (
    <IntlayerProvider>
      <ToastProvider position="bottom-center" timeout={5000}>
        <AnchoredToastProvider>{children}</AnchoredToastProvider>
      </ToastProvider>
    </IntlayerProvider>
  );
}

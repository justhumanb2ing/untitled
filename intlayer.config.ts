import { type IntlayerConfig, Locales } from "intlayer";

const config: IntlayerConfig = {
  internationalization: {
    defaultLocale: Locales.KOREAN, // 기본 로케일 설정
    locales: [Locales.KOREAN, Locales.ENGLISH], // 지원하는 로케일 목록
  },
};

export default config;

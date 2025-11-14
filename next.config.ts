// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  // 필요시 다른 Next 설정 병합
  turbopack: {},
};

export default withNextIntl(nextConfig);

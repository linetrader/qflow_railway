// src/app/[locale]/admin/wallets/withdraws/page.tsx
import WithdrawsPageView from "./view/WithdrawsPageView";

type PageProps = {
  params: {
    locale: string;
  };
};

export default function Page(props: PageProps) {
  return <WithdrawsPageView />;
}

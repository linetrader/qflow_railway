export type PackageRow = {
  id: string;
  name: string;
  price: string;
  dailyDftAmount: string;
};

export type ListResp = {
  page: number;
  size: number;
  total: number;
  items: PackageRow[];
};

export type PackageDetail = {
  id: string;
  name: string;
  price: string;
  dailyDftAmount: string;
};

export type DetailResp = {
  item: PackageDetail;
};

export type CreateResp = {
  item: { id: string; name: string; price: string; dailyDftAmount: string };
};

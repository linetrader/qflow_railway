export type PackageBrief = { id: string; name: string };

export type PackagesApiResp = {
  items: PackageBrief[];
};

export type BulkItem = { packageId: string; units: number };

export type BulkPurchaseDry = {
  dry: true;
  targets: string[];
  count: number;
};

export type BulkPurchaseRun = {
  items: Array<{
    username: string;
    ok: boolean;
    message?: string;
    totalUSD?: string;
  }>;
  total: number;
  success: number;
  fail: number;
};

export type BulkPurchaseResult = BulkPurchaseDry | BulkPurchaseRun;

export type BulkPurchasePayload = {
  prefix: string;
  pad: number;
  start?: number;
  end?: number;
  dry: boolean;
  limit?: number;
  items?: BulkItem[];
  packageId?: string;
  units?: number;
};

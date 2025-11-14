export type ApiReferralGroupSummary = {
  groupNo: number;
  salesVolume: number;
  dailyAllowanceDFT: number;
  updatedAt: string;
};

export type ApiOkTeam = {
  ok: true;
  userLevel: number | null;
  referralGroups: ApiReferralGroupSummary[];
};

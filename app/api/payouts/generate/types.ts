export type PayoutDay = "M" | "R";

export type PayoutDetail = {
  supervisorVisibleId: string;
  supervisorName: string;
  fellowVisibleId: string;
  fellowName: string;
  mpesaName: string;
  mpesaNumber: string;
  kesPayoutAmount: number;
  preSessionCount: number;
  mainSessionCount: number;
};

export type PayoutReport = {
  payoutDetails: PayoutDetail[];
  payoutPeriod: {
    startDate: Date;
    endDate: Date;
  };
  incompleteRecords: {
    countMissingMpesaName: number;
    countMissingMpesaNumber: number;
  };
  attendancesWithDelayedPaymentRequests: number;
  totalPayoutAmount: number;
  totalPayoutAmountWithMpesaInfo: number;
};

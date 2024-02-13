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
  sessionDetails: string;
  notes: string;
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
  attendancesProcessed: {
    id: string;
  }[];
  delayedPaymentsFulfilled: {
    id: string;
  }[];
  reconciliationsFulfilled: {
    id: string;
  }[];
  totalPayoutAmount: number;
  totalPayoutAmountWithMpesaInfo: number;
};

export type RepaymentReport = {
  payoutDetails: PayoutDetail[];
  totalRepaymentAmount: number;
  repaymentRequestsFulfilled: {
    id: string;
  }[];
};

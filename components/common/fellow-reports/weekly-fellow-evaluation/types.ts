export type WeeklyFellowEvaluation = {
  id: string;
  fellowName: string | null;
  avgBehaviour: number;
  avgProgramDelivery: number;
  avgDressingGrooming: number;
  week: {
    evaluationId: string;
    week: Date;
    behaviour: number | null;
    behaviourNotes: string | null;
    programDelivery: number | null;
    programDeliveryNotes: string | null;
    dressingGrooming: number | null;
    dressingGroomingNotes: string | null;
    attendancePunctuality: number;
    attendancePunctualityNotes: string | null;
    userId: string;
  }[];
};

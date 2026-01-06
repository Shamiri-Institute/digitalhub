import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import {
  ATTENDANCE_STATUS,
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_DROPOUT_REASONS,
  SCHOOL_TYPES,
  STUDENT_DROPOUT_REASONS,
  SUPERVISOR_DROP_OUT_REASONS,
} from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  dropoutReason: z.enum(SCHOOL_DROPOUT_REASONS as [string, ...string[]], {
    error: "Please select one of the supplied school dropout reason options",
  }),
});

export const DropoutSupervisorSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  // TODO: Replace dropout reasons with supervisor specific options
  dropoutReason: z.enum(SUPERVISOR_DROP_OUT_REASONS as unknown as [string, ...string[]], {
    error: "Please select one of the supplied supervisor dropout reason options",
  }),
});

export const DropoutStudentSchema = z
  .object({
    studentId: stringValidation("Missing student ID"),
    mode: z.enum(["dropout", "undo"]),
    dropoutReason: z
      .enum(STUDENT_DROPOUT_REASONS as unknown as [string, ...string[]], {
        error: "Please select one of the supplied student dropout reason options",
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.dropoutReason === undefined && val.mode === "dropout") {
      ctx.addIssue({
        code: "custom",
        message: "Please select reason for drop out.",
        fatal: true,
        path: ["dropoutReason"],
      });

      return z.NEVER;
    }
  });

// TODO: Depreciate
export const SubmitComplaintSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  comments: stringValidation().optional(),
  // TODO: Replace with complaint types array
  complaint: z.enum(SCHOOL_DROPOUT_REASONS as [string, ...string[]], {
    error: "Please select a complaint",
  }),
});

export const WeeklyHubReportSchema = z.object({
  hubId: stringValidation("Missing hub ID"),
  submittedBy: stringValidation("Missing hub coordinator ID"),
  week: z.coerce.date({ error: "Please select a week" }),
  recommendations: stringValidation("Please input recommendations"),
  schoolRelatedIssuesAndObservations: stringValidation(),
  schoolRelatedIssuesAndObservationRating: z.number({ error: "Please provide a rating" }).min(1),
  supervisorRelatedIssuesAndObservations: stringValidation(),
  supervisorRelatedIssuesAndObservationsRating: z
    .number({ error: "Please provide a rating" })
    .min(1),
  fellowRelatedIssuesAndObservations: stringValidation(),
  fellowRelatedIssuesAndObservationsRating: z.number({ error: "Please provide a rating" }).min(1),
  hubRelatedIssuesAndObservations: stringValidation(),
  hubRelatedIssuesAndObservationsRating: z.number({ error: "Please provide a rating" }).min(1),
  successes: stringValidation(),
  challenges: stringValidation(),
});

export const MonthlySupervisorEvaluationSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  month: z.coerce.date({ error: "Please select a month" }),
  respectfulness: z.number({ error: "Please provide a rating" }),
  attitude: z.number({ error: "Please provide a rating" }),
  collaboration: z.number({ error: "Please provide a rating" }),
  reliability: z.number({ error: "Please provide a rating" }),
  identificationOfIssues: z.number({ error: "Please provide a rating" }),
  leadership: z.number({ error: "Please provide a rating" }),
  communicationStyle: z.number({ error: "Please provide a rating" }),
  conflictResolution: z.number({ error: "Please provide a rating" }),
  adaptability: z.number({ error: "Please provide a rating" }),
  recognitionAndFeedback: z.number({ error: "Please provide a rating" }),
  decisionMaking: z.number({ error: "Please provide a rating" }),
  fellowRecruitmentEffectiveness: z.number({ error: "Please provide a rating" }),
  fellowTrainingEffectiveness: z.number({ error: "Please provide a rating" }),
  programLogisticsCoordination: z.number({ error: "Please provide a rating" }),
  programSessionAttendance: z.number({ error: "Please provide a rating" }),
  workplaceDemeanorComments: z.string().optional(),
  managementStyleComments: z.string().optional(),
  programExecutionComments: z.string().optional(),
});

const counties = KENYAN_COUNTIES.map((county) => county.name) as [string, ...string[]];

// Base schema with common fields
const BaseSchoolSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  schoolType: z.enum(SCHOOL_TYPES, { error: "Please pick a valid option" }).optional(),
  schoolEmail: z.email("Invalid email").optional().or(z.literal("")),
  schoolCounty: z
    .enum(counties, {
      error: "Please select a valid option",
    })
    .optional(),
  schoolSubCounty: z.string().optional(),
  schoolDemographics: z
    .enum(SCHOOL_DEMOGRAPHICS, {
      error: "Please select a valid option",
    })
    .optional(),
  pointPersonName: z.string().optional(),
  pointPersonPhone: z.string().optional(),
  pointPersonEmail: z.email("Invalid email").optional().or(z.literal("")),
  principalName: z.string().optional(),
  principalPhone: z.string().optional(),
  boardingDay: z
    .enum(BOARDING_DAY_TYPES, {
      error: "Please select a valid option",
    })
    .optional(),
});

// Schema for adding a new school (requires preSessionDate and numbersExpected)
export const AddSchoolSchema = BaseSchoolSchema.extend({
  preSessionDate: z.date({ error: "Please select a date" }).transform((val) => {
    if (!val) {
      throw new Error("Please select a date");
    }
    return val;
  }),
  numbersExpected: z.number().min(1, "Number of students is required"),
});

// Schema for editing a school (preSessionDate and numbersExpected are optional)
export const EditSchoolSchema = BaseSchoolSchema.extend({
  preSessionDate: z
    .date({ error: "Please select a date" })
    .optional()
    .transform((val) => {
      if (val) {
        return val;
      }
      return undefined;
    }),
  numbersExpected: z.number().min(1, "Number of students is required").optional(),
});

// For backward compatibility
export const SchoolInformationSchema = EditSchoolSchema;

export const EditSupervisorSchema = z
  .object({
    supervisorName: z.string({ error: "Please enter the supervisor's name" }),
    supervisorId: stringValidation("SupervisorId is required"),
    idNumber: z.string({ error: "Please enter the supervisor's ID number" }),
    cellNumber: z
      .string({ error: "Please enter the supervisor's phone number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        error: "Please enter a valid kenyan phone number",
      }),
    mpesaNumber: z
      .string({ error: "Please enter the supervisor's m-pesa number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        error: "Please enter a valid kenyan phone number",
      }),
    personalEmail: z.email({ error: "Please enter a valid email." }),
    county: z.enum(counties, {
      error: "Please pick a valid option",
    }),
    subCounty: z.string({ error: "Please pick a sub-county" }).refine((val) => val !== "", {
      error: "Please pick a sub-county",
    }),
    gender: z.string({ error: "Please enter the supervisor's gender" }),
    mpesaName: z.string({ error: "Please enter the supervisor's m-pesa name" }),
    dateOfBirth: z.coerce.date({ error: "Please select a date of birth" }),
  })
  .superRefine((val, ctx) => {
    const selectedCounty = KENYAN_COUNTIES.find((county) => county.name === val.county);
    if (
      selectedCounty &&
      !(selectedCounty.sub_counties as readonly string[]).includes(val.subCounty)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${val.subCounty} is not a valid option.`,
        fatal: true,
        path: ["subCounty"],
      });

      return z.NEVER;
    }
  });

export const AddNewSupervisorSchema = z.object({
  supervisorName: z.string({ error: "Please enter the supervisor's name" }),
  idNumber: z.string({ error: "Please enter the supervisor's ID number" }),
  cellNumber: z
    .string({ error: "Please enter the supervisor's phone number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      error: "Please enter a valid kenyan phone number",
    }),
  mpesaNumber: z
    .string({ error: "Please enter the supervisor's m-pesa number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      error: "Please enter a valid kenyan phone number",
    }),
  personalEmail: z.email({ error: "Please enter a valid email." }),
  county: z.enum(counties, {
    error: "Please pick a valid option",
  }),
  subCounty: z.string({ error: "Please pick a sub-county" }).refine((val) => val !== "", {
    error: "Please pick a sub-county",
  }),
  gender: z.string({ error: "Please enter the supervisor's gender" }),
  mpesaName: z.string({ error: "Please enter the supervisor's m-pesa name" }),
  dateOfBirth: z.coerce.date({ error: "Please select a date of birth" }),
});

export const AssignPointSupervisorSchema = z.object({
  assignedSupervisorId: z.string({ error: "Please pick a supervisor." }),
});

export const MarkSupervisorAttendanceSchema = z
  .object({
    supervisorId: z.string(),
    attended: z.enum(ATTENDANCE_STATUS, { error: "Please select attendance." }).optional(),
    sessionId: z.string(),
    absenceReason: z.string().optional(),
    comments: z.string().optional(),
  })
  // TODO: Confirm if validation is required
  .superRefine((val, ctx) => {
    const ids = val.supervisorId.split(",");
    if (val.attended === "missed" && val.absenceReason === undefined && ids.length === 1) {
      ctx.addIssue({
        code: "custom",
        message: "Please add a reason for absence",
        fatal: true,
        path: ["absenceReason"],
      });

      return z.NEVER;
    }
  });

export const WeeklyHubTeamMeetingSchema = z.object({
  hubId: stringValidation("Missing hub ID"),
  submittedBy: stringValidation("Missing hub coordinator ID"),
  week: z.coerce.date({ error: "Please select a week" }),
  logisticsRelatedIssues: stringValidation(),
  logisticsRelatedIssuesRating: z.number().lte(5),
  relationshipManagement: stringValidation(),
  relationshipManagementRating: z.number().lte(5),
  digitalHubIssues: stringValidation(),
  digitalHubIssuesRating: z.number().lte(5),
  anyOtherChallenges: stringValidation(),
  anyOtherChallengesRating: z.number().lte(5),
  recommendations: stringValidation("Please input recommendations"),
});

export const FellowDetailsSchema = z
  .object({
    mode: z.enum(["add", "edit", "view"]),
    fellowName: z.string({ error: "Please enter the fellow's name" }),
    id: z.string().optional(),
    idNumber: z.string({ error: "Please enter the fellow's ID number" }),
    cellNumber: z
      .string({ error: "Please enter the fellow's phone number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        error: "Please enter a valid kenyan phone number",
      }),
    mpesaNumber: z
      .string({ error: "Please enter the fellow's m-pesa number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        error: "Please enter a valid kenyan phone number",
      }),
    fellowEmail: z.email({ error: "Please enter a valid email." }),
    county: z
      .enum(counties, {
        error: "Please pick a valid option",
      })
      .optional(),
    subCounty: z.string({ error: "Please pick a sub-county" }).refine((val) => val !== "", {
      error: "Please pick a sub-county",
    }),
    gender: z.string({ error: "Please enter the fellow's gender" }),
    mpesaName: z.string({ error: "Please enter the fellow's m-pesa name" }),
    dateOfBirth: z.coerce.date({ error: "Please select a date of birth" }),
  })
  .superRefine((val, ctx) => {
    const selectedCounty = KENYAN_COUNTIES.find((county) => county.name === val.county);
    if (
      selectedCounty &&
      !(selectedCounty.sub_counties as readonly string[]).includes(val.subCounty)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `${val.subCounty} is not a valid option.`,
        fatal: true,
        path: ["subCounty"],
      });

      return z.NEVER;
    }

    if (val.mode === "edit" && val.id === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Fellow Id is required.",
        fatal: true,
        path: ["id"],
      });

      return z.NEVER;
    }

    if (val.county === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Please pick a county.",
        fatal: true,
        path: ["county"],
      });

      return z.NEVER;
    }
  });

export const MarkAttendanceSchema = z
  .object({
    id: z.string().optional(),
    attended: z.enum(ATTENDANCE_STATUS, {
      error: "Please mark attendance",
    }),
    sessionId: stringValidation("session ID is required"),
    absenceReason: z.string().optional(),
    comments: z.string().optional(),
    bulkMode: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.attended === "missed" && val.absenceReason === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Please select reason for absence.",
        fatal: true,
        path: ["absenceReason"],
      });

      return z.NEVER;
    }

    if (!val.bulkMode && val.id === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "ID is required",
        fatal: true,
        path: ["id"],
      });

      return z.NEVER;
    }
  });

export const StudentReportingNotesSchema = z.object({
  studentId: stringValidation("Student ID is required"),
  notes: stringValidation("Please add your note"),
});

export const HubCoordinatorSchema = z.object({
  coordinatorEmail: z.email(),
  coordinatorName: z.string(),
  idNumber: z.string(),
  cellNumber: z.string(),
  mpesaNumber: z.string(),
  dateOfBirth: z.string().optional(),
  gender: z.string(),
  county: z.string(),
  subCounty: z.string(),
  bankName: z.string(),
  bankBranch: z.string(),
});

export type HubCoordinatorType = z.infer<typeof HubCoordinatorSchema>;

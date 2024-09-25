import {
  ATTENDANCE_STATUS,
  BOARDING_DAY_TYPES,
  KENYAN_COUNTIES,
  SCHOOL_DEMOGRAPHICS,
  SCHOOL_DROPOUT_REASONS,
  SCHOOL_TYPES,
} from "#/lib/app-constants/constants";
import { stringValidation } from "#/lib/utils";
import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

export const DropoutSchoolSchema = z.object({
  schoolId: stringValidation("Missing school ID"),
  dropoutReason: z.enum(
    [SCHOOL_DROPOUT_REASONS[0]!, ...SCHOOL_DROPOUT_REASONS.slice(1)],
    {
      errorMap: (_issue, _ctx) => ({
        message:
          "Please select one of the supplied school dropout reason options",
      }),
    },
  ),
});

export const DropoutSupervisorSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  // TODO: Replace dropout reasons with supervisor specific options
  dropoutReason: z.enum(
    [SCHOOL_DROPOUT_REASONS[0]!, ...SCHOOL_DROPOUT_REASONS.slice(1)],
    {
      errorMap: (_issue, _ctx) => ({
        message:
          "Please select one of the supplied supervisor dropout reason options",
      }),
    },
  ),
});

export const SubmitComplaintSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  comments: stringValidation().optional(),
  // TODO: Replace with complaint types array
  complaint: z.enum(
    [SCHOOL_DROPOUT_REASONS[0]!, ...SCHOOL_DROPOUT_REASONS.slice(1)],
    {
      errorMap: (_issue, _ctx) => ({
        message: "Please select a complaint",
      }),
    },
  ),
});

export const WeeklyHubReportSchema = z.object({
  hubId: stringValidation("Missing hub ID"),
  submittedBy: stringValidation("Missing hub coordinator ID"),
  week: z.coerce.date({ required_error: "Please select a week" }),
  recommendations: stringValidation("Please input recommendations"),
  schoolRelatedIssuesAndObservations: stringValidation(),
  schoolRelatedIssuesAndObservationRating: z.number().lte(5),
  supervisorRelatedIssuesAndObservations: stringValidation(),
  supervisorRelatedIssuesAndObservationsRating: z.number().lte(5),
  fellowRelatedIssuesAndObservations: stringValidation(),
  fellowRelatedIssuesAndObservationsRating: z.number().lte(5),
  hubRelatedIssuesAndObservations: stringValidation(),
  hubRelatedIssuesAndObservationsRating: z.number().lte(5),
  successes: stringValidation(),
  challenges: stringValidation(),
});

export const MonthlySupervisorEvaluationSchema = z.object({
  supervisorId: stringValidation("Missing supervisor ID"),
  month: z.coerce.date({ required_error: "Please select a month" }),
  respectfulness: z.number({
    required_error: "Please provide a rating",
  }),
  attitude: z.number({
    required_error: "Please provide a rating",
  }),
  collaboration: z.number({
    required_error: "Please provide a rating",
  }),
  reliability: z.number({
    required_error: "Please provide a rating",
  }),
  identificationOfIssues: z.number({
    required_error: "Please provide a rating",
  }),
  leadership: z.number({
    required_error: "Please provide a rating",
  }),
  communicationStyle: z.number({
    required_error: "Please provide a rating",
  }),
  conflictResolution: z.number({
    required_error: "Please provide a rating",
  }),
  adaptability: z.number({
    required_error: "Please provide a rating",
  }),
  recognitionAndFeedback: z.number({
    required_error: "Please provide a rating",
  }),
  decisionMaking: z.number({
    required_error: "Please provide a rating",
  }),
  fellowRecruitmentEffectiveness: z.number({
    required_error: "Please provide a rating",
  }),
  fellowTrainingEffectiveness: z.number({
    required_error: "Please provide a rating",
  }),
  programLogisticsCoordination: z.number({
    required_error: "Please provide a rating",
  }),
  programSessionAttendance: z.number({
    required_error: "Please provide a rating",
  }),
  workplaceDemeanorComments: z.string().optional(),
  managementStyleComments: z.string().optional(),
  programExecutionComments: z.string().optional(),
});

const counties = KENYAN_COUNTIES.map((county) => county.name);

export const EditSchoolSchema = z.object({
  numbersExpected: z.coerce
    .number({
      required_error: "Please enter the promised number of students.",
    })
    .optional(),
  schoolEmail: z
    .string({
      required_error: "Please enter the school's email.",
    })
    .email({
      message: "Please enter a valid email.",
    })
    .optional(),
  schoolCounty: z
    .enum([counties[0]!, ...counties.slice(1)], {
      invalid_type_error: "Please pick a valid option",
    })
    .optional(),
  schoolSubCounty: z
    .string({
      invalid_type_error: "Please pick a valid sub county.",
      description: "Pick a county first",
    })
    .optional(),
  schoolContact: z
    .string({
      required_error: "Please enter the school's contact number.",
    })
    .optional(),
  schoolDemographics: z
    .enum(SCHOOL_DEMOGRAPHICS, {
      invalid_type_error: "Please pick a valid option",
    })
    .optional(),
  boardingDay: z
    .enum(BOARDING_DAY_TYPES, {
      invalid_type_error: "Please pick a valid option",
    })
    .optional(),
  schoolType: z
    .enum(SCHOOL_TYPES, {
      invalid_type_error: "Please pick a valid option",
    })
    .optional(),
  pointPersonName: z
    .string({ required_error: "Please enter the point person's name" })
    .optional(),
  pointPersonEmail: z
    .string({ required_error: "Please enter the point person's email" })
    .email({
      message: "Please enter a valid email.",
    })
    .optional(),
  pointPersonPhone: z
    .string({
      required_error: "Please enter the point person's phone number",
    })
    .nullable()
    .superRefine((val, ctx) => {
      console.log(val);
      if (val !== null) {
        val.split("/").forEach((phone: string) => {
          if (!isValidPhoneNumber(phone, "KE") && phone !== " ") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: phone + " is not a valid kenyan number",
              fatal: true,
            });
          }
        });
      }
    })
    .optional(),
  schoolName: z
    .string({ required_error: "Please enter the school's name" })
    .optional(),
  principalName: z
    .string({ required_error: "Please enter the principal's name" })
    .optional(),
  principalPhone: z
    .string({
      required_error: "Please enter the principal's phone number",
    })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid kenyan phone number",
    })
    .optional(),
});

export const EditSupervisorSchema = z
  .object({
    supervisorName: z.string({
      required_error: "Please enter the supervisor's name",
    }),
    supervisorId: stringValidation("SupervisorId is required"),
    idNumber: z.string({
      required_error: "Please enter the supervisor's ID number",
    }),
    cellNumber: z
      .string({ required_error: "Please enter the supervisor's phone number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        message: "Please enter a valid kenyan phone number",
      }),
    mpesaNumber: z
      .string({ required_error: "Please enter the supervisor's m-pesa number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        message: "Please enter a valid kenyan phone number",
      }),
    personalEmail: z
      .string({
        required_error: "Please enter the supervisor's email.",
      })
      .email({
        message: "Please enter a valid email.",
      }),
    county: z.enum([counties[0]!, ...counties.slice(1)], {
      errorMap: (issue, ctx) => ({ message: "Please pick a valid option" }),
    }),
    subCounty: z
      .string({
        invalid_type_error: "Please pick a valid sub county.",
        required_error: "Please pick a sub-county",
      })
      .refine((val) => val !== "", {
        message: "Please pick a sub-county",
      }),
    gender: z.string({
      required_error: "Please enter the supervisor's gender",
    }),
    mpesaName: z.string({
      required_error: "Please enter the supervisor's m-pesa number",
    }),
    dateOfBirth: z.coerce.date({
      required_error: "Please select a date of birth",
    }),
  })
  .superRefine((val, ctx) => {
    const selectedCounty = KENYAN_COUNTIES.find(
      (county) => county.name === val.county,
    );
    if (
      selectedCounty &&
      !Array.from(selectedCounty.sub_counties).includes(
        val.subCounty as keyof (typeof selectedCounty.sub_counties)[0],
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${val.subCounty} is not a valid option.`,
        fatal: true,
        path: ["subCounty"],
      });

      return z.NEVER;
    }
  });

export const AddNewSupervisorSchema = z.object({
  supervisorName: z.string({
    required_error: "Please enter the supervisor's name",
  }),
  idNumber: z.string({
    required_error: "Please enter the supervisor's ID number",
  }),
  cellNumber: z
    .string({ required_error: "Please enter the supervisor's phone number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid kenyan phone number",
    }),
  mpesaNumber: z
    .string({ required_error: "Please enter the supervisor's m-pesa number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid kenyan phone number",
    }),
  personalEmail: z
    .string({
      required_error: "Please enter the supervisor's email.",
    })
    .email({
      message: "Please enter a valid email.",
    }),
  county: z.enum([counties[0]!, ...counties.slice(1)], {
    errorMap: (issue, ctx) => ({ message: "Please pick a valid option" }),
  }),
  subCounty: z
    .string({
      invalid_type_error: "Please pick a valid sub county.",
      required_error: "Please pick a sub-county",
    })
    .refine((val) => val !== "", {
      message: "Please pick a sub-county",
    }),
  gender: z.string({ required_error: "Please enter the supervisor's gender" }),
  mpesaName: z.string({
    required_error: "Please enter the supervisor's m-pesa number",
  }),
  dateOfBirth: z.coerce.date({
    required_error: "Please select a date of birth",
  }),
});

export const AddNewStudentSchema = z.object({
  studentName: z.string({
    required_error: "Please enter the student's name",
  }),
  phoneNumber: z
    .string({ required_error: "Please enter the student's contact number" })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid kenyan phone number",
    }),
  schoolId: stringValidation("School ID required"),
  assignedGroupId: stringValidation("Group ID required"),
  form: stringValidation("Please enter the student's form"),
  stream: stringValidation("Please enter the student's stream"),
  gender: stringValidation("Please select the student's gender"),
  admissionNumber: stringValidation(
    "Please enter the student's admission number",
  ),
  yearOfBirth: z.coerce.number({
    required_error: "Please enter year of birth",
  }),
});

export const StudentDetailsSchema = z.object({
  id: stringValidation("ID is required"),
  studentName: z.string({
    required_error: "Please enter the student's name",
  }),
  form: z.coerce.number({
    required_error: "Please enter the student's class",
  }),
  stream: stringValidation("Please enter the student's stream"),
  gender: stringValidation("Please select the student's gender"),
  admissionNumber: stringValidation(
    "Please enter the student's admission number",
  ),
  yearOfBirth: z.coerce.number({
    required_error: "Please enter year of birth",
  }),
  phoneNumber: z
    .string({
      required_error: "Please enter the student's phone number",
    })
    .refine((val) => isValidPhoneNumber(val, "KE"), {
      message: "Please enter a valid kenyan phone number",
    })
    .optional(),
});

export const AssignPointSupervisorSchema = z.object({
  assignedSupervisorId: z.string({
    required_error: "Please pick a supervisor.",
  }),
});

export const ScheduleNewSessionSchema = z.object({
  sessionType: stringValidation("Please select a session type"),
  schoolId: stringValidation("Please select a school"),
  sessionDate: z.coerce.date({ required_error: "Please select a date" }),
  sessionStartTime: stringValidation("Please select a start time"),
  sessionDuration: stringValidation("Please select the session's duration"),
  projectId: z.string().optional(),
  // notifications: stringValidation(),
  // sendReminders: stringValidation("Please select a send reminder option"),
});

export const RescheduleSessionSchema = z.object({
  sessionDate: z.coerce.date({ required_error: "Please select a date" }),
  sessionStartTime: stringValidation("Please select a start time"),
  sessionDuration: stringValidation("Please select the session's duration"),
});

export const MarkSupervisorAttendanceSchema = z
  .object({
    supervisorId: z.string(),
    attended: z
      .enum(ATTENDANCE_STATUS, {
        invalid_type_error: "Please select attendance.",
      })
      .optional(),
    sessionId: z.string(),
    absenceReason: z.string().optional(),
    comments: z.string().optional(),
  })
  // TODO: Confirm if validation is required
  .superRefine((val, ctx) => {
    const ids = val.supervisorId.split(",");
    if (
      val.attended === "missed" &&
      val.absenceReason === undefined &&
      ids.length === 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
  week: z.coerce.date({ required_error: "Please select a week" }),
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
    mode: z.enum(["add", "edit"]),
    fellowName: z.string({
      required_error: "Please enter the fellow's name",
    }),
    id: z.string().optional(),
    idNumber: z.string({
      required_error: "Please enter the fellow's ID number",
    }),
    cellNumber: z
      .string({ required_error: "Please enter the fellow's phone number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        message: "Please enter a valid kenyan phone number",
      }),
    mpesaNumber: z
      .string({ required_error: "Please enter the fellow's m-pesa number" })
      .refine((val) => isValidPhoneNumber(val, "KE"), {
        message: "Please enter a valid kenyan phone number",
      }),
    fellowEmail: z
      .string({
        required_error: "Please enter the fellow's email.",
      })
      .email({
        message: "Please enter a valid email.",
      }),
    county: z.enum([counties[0]!, ...counties.slice(1)], {
      errorMap: (issue, ctx) => ({ message: "Please pick a valid option" }),
    }),
    subCounty: z
      .string({
        invalid_type_error: "Please pick a valid sub county.",
        required_error: "Please pick a sub-county",
      })
      .refine((val) => val !== "", {
        message: "Please pick a sub-county",
      }),
    gender: z.string({
      required_error: "Please enter the fellow's gender",
    }),
    mpesaName: z.string({
      required_error: "Please enter the fellow's m-pesa number",
    }),
    dateOfBirth: z.coerce.date({
      required_error: "Please select a date of birth",
    }),
  })
  .superRefine((val, ctx) => {
    const selectedCounty = KENYAN_COUNTIES.find(
      (county) => county.name === val.county,
    );
    if (
      selectedCounty &&
      !Array.from(selectedCounty.sub_counties).includes(
        val.subCounty as keyof (typeof selectedCounty.sub_counties)[0],
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${val.subCounty} is not a valid option.`,
        fatal: true,
        path: ["subCounty"],
      });

      return z.NEVER;
    }

    if (val.mode === "edit" && val.id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fellow Id is required.`,
        fatal: true,
        path: ["id"],
      });

      return z.NEVER;
    }
  });

export const MarkAttendanceSchema = z
  .object({
    id: stringValidation("ID is required"),
    attended: z.enum(ATTENDANCE_STATUS, {
      errorMap: (issue, _ctx) => ({
        message: "Please mark attendance",
      }),
    }),
    sessionId: stringValidation("session ID is required"),
    absenceReason: z.string().optional(),
    comments: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.attended === "missed" && val.absenceReason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Please select reason for absence.`,
        fatal: true,
        path: ["absenceReason"],
      });

      return z.NEVER;
    }
  });

export const StudentReportingNotesSchema = z.object({
  studentId: stringValidation("Student ID is required"),
  notes: stringValidation("Please add your note"),
});

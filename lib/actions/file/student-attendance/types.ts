export const NO_ATTENDANCE_DOCUMENT_MESSAGE = "No attendance document found for this session";

export interface StudentAttendanceDocsFilters {
  sessionId?: string;
  groupId?: string;
}

export interface AttendanceDoc {
  id: string;
  fileName: string;
  link: string;
  presignedUrl: string;
  createdAt: Date;
}

export interface CreateStudentAttendanceDocPayload {
  groupId: string;
  sessionId: string;
  link: string;
  token: string;
}

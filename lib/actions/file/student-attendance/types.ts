export interface StudentAttendanceDocsFilters {
  sessionId?: string;
  groupId?: string;
}

export interface AttendanceDocument {
  id: string;
  fileName: string;
  link: string;
  presignedUrl: string;
  createdAt: Date;
}

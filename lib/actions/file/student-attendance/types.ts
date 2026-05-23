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
};

export interface CreateStudentAttendanceDocPayload {
  fileName: string;
  groupId: string;
  sessionId: string;
  link: string;
}

export interface AttendanceDocS3Key{
  schoolName: string;
  fellowName: string;
  groupName: string;
  sessionDate: Date;
  sessionType: string;
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export default function OverallStudentsClinicalStats({
  totalStudents = 0,
  groupSessions = 0,
  clinicalCases = 0,
  clinicalSessions = 0,
}: {
  totalStudents: number;
  groupSessions: number;
  clinicalCases: number;
  clinicalSessions: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card key="total-students">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStudents}</div>
        </CardContent>
      </Card>

      <Card key="group-sessions">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Group Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{groupSessions}</div>
        </CardContent>
      </Card>

      <Card key="clinical-cases">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clinical Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clinicalCases}</div>
        </CardContent>
      </Card>

      <Card key="clinical-sessions">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Clinical Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clinicalSessions}</div>
        </CardContent>
      </Card>
    </div>
  );
}

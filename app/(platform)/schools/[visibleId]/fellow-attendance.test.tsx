import { act, fireEvent, render, screen } from "@testing-library/react";
import { addDays, setHours, setMinutes } from "date-fns";
import { expect, test, vi } from "vitest";

import { FellowAttendanceDot } from "#/app/(platform)/schools/[visibleId]/fellow-attendance-dot";
import { AttendanceStatus, SessionLabel } from "#/types/app";

vi.mock("#/app/actions", () => ({
  markFellowAttendance: async () => {
    return { success: true };
  },
}));

test("should correctly identify if a session date is within the allowed period for marking attendance", async () => {
  // Say a user is trying to record attendance on Wednesday, February 7, 2024, 8:59 AM
  const recordTime = setMinutes(setHours(new Date(2024, 1, 7), 8), 59);

  // For a session that occurred the previous day
  const sessionDate = addDays(recordTime, -1);

  const props = generateProps({
    status: "not-marked",
    label: "S3",
    sessionDate,
    recordTime,
  });

  const { unmount } = render(<FellowAttendanceDot {...props} />);

  const attendanceDot = screen.getByTestId("attendance-dot");

  await act(async () => {
    fireEvent.click(attendanceDot);
  });

  expect(screen.getByText("present")).toBeDefined();

  unmount();
});

test("should not allow marking attendance after the cutoff date without delayed payment request confirmation", async () => {
  // Say a user is trying to record attendance on Thursday, February 8, 2024, 9:01 AM (just after the cutoff)
  const recordTime = setMinutes(setHours(new Date(2024, 1, 8), 9), 1);

  // For a session that occurred the previous day
  const sessionDate = addDays(recordTime, -1);

  const props = generateProps({
    status: "not-marked",
    label: "S1",
    sessionDate,
    recordTime,
  });

  const { unmount } = render(<FellowAttendanceDot {...props} />);

  const attendanceDot = screen.getByTestId("attendance-dot");

  await act(async () => {
    fireEvent.click(attendanceDot);
  });

  // They should be presented with delayed payment request dialog
  expect(screen.queryByText("Submit delayed payment")).toBeDefined();

  await act(async () => {
    fireEvent.click(screen.getByTestId("submit-delayed-payment-button"));
  });

  expect(screen.queryByText("present")).toBeDefined();

  unmount();
});

function generateProps({
  status,
  label,
  sessionDate,
  recordTime,
}: {
  status: AttendanceStatus;
  label: SessionLabel;
  sessionDate: Date;
  recordTime: Date;
}) {
  return {
    sessionItem: {
      status: status,
      label: label,
      session: {
        id: "isess_01hmttr066fn7tmp9dw46crs6s",
        createdAt: new Date("2024-01-23T09:34:41.351Z"),
        updatedAt: new Date("2024-01-23T09:34:41.351Z"),
        archivedAt: null,
        sessionDate: sessionDate,
        sessionName: "Session 3",
        sessionType: "s3",
        schoolId: "sch_01hmttqzhgerar24yk4gdj90mn",
        occurred: true,
        occurringAt: null,
        yearOfImplementation: 2023,
      },
    },
    fellow: {
      id: "fellow_01hmttr1g6fmrv8y4w1gmemjm0",
      createdAt: new Date("2024-01-23T09:34:42.696Z"),
      updatedAt: new Date("2024-01-23T09:34:42.696Z"),
      archivedAt: null,
      visibleId: "TFW23_S_247",
      fellowName: "Juliet Nandako ",
      fellowEmail: null,
      yearOfImplementation: 2023,
      mpesaName: "Juliet Nandako",
      mpesaNumber: "797404091",
      idNumber: null,
      cellNumber: "797404091",
      county: null,
      subCounty: null,
      dateOfBirth: null,
      gender: "F",
      transferred: false,
      hubId: "hub_01hmttqzb9ffkt0dpm3sq155cj",
      implementerId: "impl_01hmttqz98e5vrdw2jm6ecappf",
      supervisorId: "sup_01hmttr0h8ej6aq0hszvtwtz40",
      droppedOut: false,
      droppedOutAt: null,
      dropOutReason: null,
      fellowAttendances: [],
    },
    school: {
      id: "sch_01hmttqzhgerar24yk4gdj90mn",
      createdAt: new Date("2024-01-23T09:34:40.688Z"),
      updatedAt: new Date("2024-01-23T09:34:40.688Z"),
      archivedAt: null,
      schoolName: "Muthurwa Girls",
      schoolType: "Extra-county",
      schoolEmail: null,
      schoolCounty: "Kiambu",
      schoolDemographics: "Girls ",
      visibleId: "ANS23_School_25",
      implementerId: "impl_01hmttqz98e5vrdw2jm6ecappf",
      hubId: "hub_01hmttqzb9ffkt0dpm3sq155cj",
      pointPersonName: "Jacinta Karanja",
      pointPersonId: null,
      pointPersonPhone: null,
      pointPersonEmail: null,
      numbersExpected: null,
      boardingDay: "Boarding",
      longitude: 36.742653,
      latitude: -1.175783,
      droppedOut: false,
      dropoutReason: null,
      preSessionDate: null,
      session1Date: null,
      session2Date: null,
      session3Date: null,
      session4Date: null,
      clinicalFollowup1Date: null,
      clinicalFollowup2Date: null,
      clinicalFollowup3Date: null,
      clinicalFollowup4Date: null,
      clinicalFollowup5Date: null,
      clinicalFollowup6Date: null,
      clinicalFollowup7Date: null,
      clinicalFollowup8Date: null,
      dataCollectionFollowup1Date: null,
    },
    recordTime,
  };
}

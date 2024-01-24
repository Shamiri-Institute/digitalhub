import { fireEvent, render, screen } from "@testing-library/react";
import { addDays } from "date-fns";
import { expect, test } from "vitest";

import { FellowAttendanceDot } from "#/app/(platform)/schools/[visibleId]/fellow-attendance-dot";
import { AttendanceStatus, SessionLabel } from "types/app";

test("attendanceDateBeyondCutoff returns correct value for different dates", () => {
  // Test when session date is within the allowed period for marking attendance
  let props = generateProps({
    status: "not-marked",
    label: "S3",
    sessionDate: new Date(),
  });
  render(<FellowAttendanceDot {...props} />);

  const attendanceDot = screen.getByTestId("attendance-dot");
  fireEvent.click(attendanceDot);

  expect(screen.getByText("present")).toBeDefined();

  // Test when session date is after the allowed period for marking attendance
  props = generateProps({
    status: "absent",
    label: "S2",
    sessionDate: addDays(new Date(), 2),
  });
  render(<FellowAttendanceDot {...props} />);
  expect(screen.getByText("absent")).toBeDefined();

  props = generateProps({
    status: "not-marked",
    label: "S2",
    sessionDate: addDays(new Date(), 2),
  });
  render(<FellowAttendanceDot {...props} />);
  expect(screen.getByText("absent")).toBeDefined();
});

function generateProps({
  status,
  label,
  sessionDate,
}: {
  status: AttendanceStatus;
  label: SessionLabel;
  sessionDate: Date;
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
  };
}

import { Fellow, School, Supervisor } from "@prisma/client";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { addDays, addWeeks, setHours, setMinutes } from "date-fns";
import { describe, expect, test, vi } from "vitest";

import { FellowAttendanceDot } from "#/app/(platform)/schools/[visibleId]/fellow-attendance-dot";
import { AttendanceStatus, SessionLabel } from "#/types/app";

vi.mock("#/app/actions", () => ({
  markFellowAttendance: async () => {
    return { attendance: { id: 1 } };
  },
}));

vi.mock("#/app/(platform)/schools/[visibleId]/actions", () => ({
  submitDelayedPaymentRequest: async () => {
    return { id: 1 };
  },
}));

describe("if attendance in unmarked initial state", () => {
  test("should allow marking attendance before the cutoff", async () => {
    // Say a user is trying to record attendance on Wednesday, February 7, 2024, 8:59 AM
    const recordTime = setMinutes(setHours(new Date(2024, 1, 7), 8), 59);

    // For a session that occurred the previous day
    const sessionDate = addDays(recordTime, -1);

    const props = generateFellowAttendanceDotProps({
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
    const recordTime = setMinutes(setHours(new Date(2024, 1, 8), 11), 1);

    // For a session that occurred the previous day
    const sessionDate = addDays(recordTime, -1);

    const props = generateFellowAttendanceDotProps({
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
});

describe("if attendance in absent initial state", () => {
  test("should correctly identify if a session date is within the allowed period for marking attendance", async () => {
    // Say a user is trying to record attendance on Wednesday, February 7, 2024, 8:59 AM
    const recordTime = setMinutes(setHours(new Date(2024, 1, 7), 8), 59);

    // For a session that occurred the previous day
    const sessionDate = addDays(recordTime, -1);

    const props = generateFellowAttendanceDotProps({
      status: "absent",
      label: "S2",
      sessionDate,
      recordTime,
    });

    const { unmount } = render(<FellowAttendanceDot {...props} />);

    const attendanceDot = screen.getByTestId("attendance-dot");

    await act(async () => {
      fireEvent.click(attendanceDot); // Click to go from absent to not-marked
    });

    await act(async () => {
      fireEvent.click(attendanceDot); // Click to go from not-marked to present
    });

    expect(screen.getByText("present")).toBeDefined();

    unmount();
  });
});

describe("if attendance in present initial state", () => {
  test("should not be able to change attendance status if past cutoff date", async () => {
    // Say a user is trying to record attendance on Wednesday, February 7, 2024, 11:00 AM
    const recordTime = setMinutes(setHours(new Date(2024, 1, 7), 11), 0);

    // For a session that occurred Wednesday the previous week
    const sessionDate = addWeeks(recordTime, -1);

    const props = generateFellowAttendanceDotProps({
      status: "present",
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

  test("should be able to change attendance status if before cutoff date", async () => {
    // Say a user is trying to modify attendance on Thursday, February 8, 2024, 8:59 AM (just before the cutoff)
    const recordTime = setMinutes(setHours(new Date(2024, 1, 8), 9), 1);

    // For a session that occurred the previous day, Wednesday
    const sessionDate = addDays(recordTime, -1);

    const props = generateFellowAttendanceDotProps({
      status: "present",
      label: "S1",
      sessionDate,
      recordTime,
    });

    const { unmount } = render(<FellowAttendanceDot {...props} />);

    const attendanceDot = screen.getByTestId("attendance-dot");

    await act(async () => {
      fireEvent.click(attendanceDot);
    });

    expect(screen.queryByText("not-marked")).toBeDefined();

    unmount();
  });
});

function generateFellowAttendanceDotProps({
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
        projectId: "proj_0123456789",
        occurred: true,
        yearOfImplementation: 2023,
      },
    },
    fellow: {
      visibleId: "TFW23_S_247",
      fellowName: "Juliet Nandako ",
    } as Fellow,
    school: {
      schoolName: "Muthurwa Girls",
      visibleId: "ANS23_School_25",
    } as School,
    supervisor: {
      id: "sup_01hmttr0h8ej6aq0hszvtwtz40",
    } as Supervisor,
    recordTime,
  };
}

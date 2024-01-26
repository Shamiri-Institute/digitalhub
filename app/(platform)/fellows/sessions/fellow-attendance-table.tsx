import { Prisma } from "@prisma/client";
import { format } from "date-fns";

import { mapSessionTypeToSessionNumber } from "#/prisma/scripts/utils";

export function FellowAttendanceTable({
  attendance,
}: {
  attendance: Prisma.FellowAttendanceGetPayload<{
    include: { school: true; session: true };
  }>[];
}) {
  return (
    <div>
      <div className="flex justify-start">
        <h2 className="mb-6 text-2xl font-semibold text-brand">Sessions</h2>
      </div>
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Session
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      School
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {!attendance.length && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 pl-4 pr-3 text-center text-sm font-medium text-gray-500 sm:pl-6"
                      >
                        No sessions attended
                      </td>
                    </tr>
                  )}
                  {attendance
                    .filter((att) => att.attended)
                    .map((att) => (
                      <tr key={att.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {att.session
                            ? mapSessionTypeToSessionNumber(
                                att.session?.sessionType,
                              )
                                .toString()
                                .padStart(2, "0")
                            : "N/A"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {att.school.schoolName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {att.session
                            ? format(att.session.sessionDate, "dd MMM yyyy")
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

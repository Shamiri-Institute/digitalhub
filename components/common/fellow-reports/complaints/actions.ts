"use server";

export type FellowComplaintsType = Awaited<
  ReturnType<typeof loadFellowComplaints>
>[number];

export async function loadFellowComplaints() {
  return [
    {
      id: "eval_1",
      fellowName: "John Doe",
      supervisorName: "Jane Doe",
      complaints: [
        {
          complaintId: "eval_1_1",
          date: "2025-01-01",
          complaint: "Complaint 1",
          additionalComments: "Additional Comments 1",
        },
        {
          complaintId: "eval_1_2",
          date: "2025-01-02",
          complaint: "Complaint 2",
          additionalComments: "Additional Comments 2",
        },
      ],
    },
    {
      id: "eval_2",
      fellowName: "Jane Doe",
      supervisorName: "John Doe",
      complaints: [
        {
          complaintId: "eval_2_1",
          date: "2025-01-01",
          complaint: "Complaint 1",
          additionalComments: "Additional Comments 1",
        },
        {
          complaintId: "eval_2_2",
          date: "2025-01-02",
          complaint: "Complaint 2",
          additionalComments: "Additional Comments 2",
        },
        {
          complaintId: "eval_2_3",
          date: "2025-01-03",
          complaint: "Complaint 3",
          additionalComments: "Additional Comments 3",
        },
      ],
    },
  ];
}

import { faker } from "@faker-js/faker";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { format } from "date-fns";

import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";
import { fixtures } from "#/prisma/scripts/fixtures";
import {
  mapSessionTypeToSessionNumber,
  parseCsvBoolean,
  parseCsvFile,
} from "#/prisma/scripts/utils";

async function seedDatabase() {
  await truncateTables();

  await createImplementers(db);
  await createUsers(db);
  await createHubs(db);
  await createSchools(db);
  await createInterventionSessions(db);
  await createSupervisors(db);
  await createFellows(db);
  await createInterventionGroupSessions(db);
  await createFellowAttendances(db);
  await createStudents(db);
  await createFixtures(db);

  console.log("Development database seeding complete 🌱");
}

seedDatabase()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

async function truncateTables() {
  console.log("Truncating tables");
  await db.$executeRaw`
          TRUNCATE TABLE implementers, implementer_avatars, implementer_invites, implementer_members, files, users, accounts, sessions, verification_tokens, user_avatars, user_recent_opens, hubs, students, student_outcomes, fellows, intervention_sessions, intervention_group_sessions, intervention_session_ratings, intervention_session_notes, fellow_attendances, supervisors, schools, hub_coordinators, student_complaints, repayment_requests, reimbursement_requests CASCADE;
          `;
}

async function createImplementers(db: Database) {
  console.log("Creating implementers");

  await parseCsvFile("implementer_info", async (implementer: any) => {
    await db.implementer.create({
      data: {
        id: objectId("impl"),
        visibleId: implementer["Implementer_ID"],
        implementerName: implementer["Implementer"],
        implementerType: implementer["Implementer_Type"],
        implementerAddress: implementer["address"],
        pointPersonName: implementer["Point_Person_Name"],
        pointPersonPhone: implementer["PP_Phone"],
        pointPersonEmail: implementer["PP_Email"],
      },
    });
  });
}

async function createUsers(db: Database) {
  const adapter = PrismaAdapter(db);
  for (let user of fixtures.users) {
    if (adapter.createUser) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: user.implementerByVisibleId },
      });
      await adapter.createUser({
        name: user.name,
        email: user.email,
        emailVerified: new Date(),
        image: user.avatarUrl,
      });
      const createdUser = await db.user.findFirstOrThrow({
        where: { email: user.email },
      });
      await db.implementerMember.create({
        data: {
          implementerId: implementer.id,
          userId: createdUser.id,
          role: user.implementerRole,
        },
      });
    }
  }
}

async function createHubs(db: Database) {
  console.log("Creating hubs");

  await parseCsvFile("hub_info", async (hub: any) => {
    const implementer = await db.implementer.findFirstOrThrow({
      where: { visibleId: hub["implementer_id"] },
    });

    let hubCoordinatorId: string | null = null;
    if (hub["Hub_coordinator_ID"]) {
      const hubCoordinator = await db.hubCoordinator.create({
        data: {
          id: objectId("coord"),
          visibleId: hub["Hub_coordinator_ID"],
          coordinatorName: hub["Hub_coordinator_Name"],
          implementerId: implementer.id,
        },
      });
      hubCoordinatorId = hubCoordinator.id;
    }

    await db.hub.create({
      data: {
        id: objectId("hub"),
        visibleId: hub["Hub_ID"],
        hubName: hub["Hub_Name"],
        implementerId: implementer.id,
        coordinatorId: hubCoordinatorId,
      },
    });
  });
}

async function createSchools(db: Database) {
  console.log("Creating schools");

  await parseCsvFile("school_info", async (school: any) => {
    let implementerId: string | undefined;
    if (school["Implementer_ID"]) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: school["Implementer_ID"] },
      });
      implementerId = implementer.id;
    }

    let hubId: string | undefined;
    if (school["Hub_ID"]) {
      const hub = await db.hub.findUnique({
        where: { visibleId: school["Hub_ID"] },
      });
      hubId = hub?.id;
    }

    await db.school.create({
      data: {
        id: objectId("sch"),
        schoolName: school["School_Name"],
        schoolType: school["School_Type"],
        schoolEmail: school["School_email"],
        schoolCounty: school["School_County"],
        schoolDemographics: school["School_Demographics"],
        visibleId: school["School_ID"],
        implementerId: implementerId,
        hubId: hubId,
        pointPersonName: school["Point_Person_Name"],
        pointPersonId: school["Point_Person_ID"],
        pointPersonPhone: school["Point_Person_Phone"],
        pointPersonEmail: school["Point_Person_Email"],
        numbersExpected: parseInt(school["Numbers_Expected"]),
        boardingDay: school["Boarding_day"],
        longitude: school["Longitude"] ? parseFloat(school["Longitude"]) : null,
        latitude: school["Latitude"] ? parseFloat(school["Latitude"]) : null,
        droppedOut: Boolean(school["Dropped_Out"]),
      },
    });
  });
}

async function createInterventionSessions(db: Database) {
  console.log("Creating intervention sessions");

  // This csv was created with the following SQL query in
  // an effort to reverse engineer the scheduled intervention session dates per school
  // SELECT s.visible_id, fa.session_number, fa.session_date, bool_or(fa.attended) as any_attended
  // FROM fellow_attendances fa
  // INNER JOIN schools s ON s.id = fa.school_id
  // GROUP BY s.visible_id, fa.session_number, fa.session_date
  // ORDER BY s.visible_id, fa.session_number;
  await parseCsvFile("intervention_sessions", async (session: any) => {
    try {
      const sessionDate = new Date(session["session_date"]);
      await db.interventionSession.create({
        data: {
          id: objectId("isess"),
          sessionDate,
          sessionName: `${
            session["session_number"] === "0"
              ? "Presession"
              : `Session ${session["session_number"]}`
          }`,
          sessionType: `s${session["session_number"]}`,
          schoolId: (await db.school.findFirst({
            where: { visibleId: session["school_visible_id"] },
          }))!.id,
          occurred: parseCsvBoolean(session["any_attended"]),
          yearOfImplementation: sessionDate.getFullYear(),
        },
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  });
}

async function createSupervisors(db: Database) {
  console.log("Creating supervisors");

  await parseCsvFile("supervisor_info", async (supervisor: any) => {
    try {
      await db.supervisor.create({
        data: {
          id: objectId("sup"),
          hubId: supervisor["Hub_ID"]
            ? (
                await db.hub.findUnique({
                  where: { visibleId: supervisor["Hub_ID"] },
                })
              )?.id
            : null,
          visibleId: supervisor["Supervisor_ID"],
          supervisorName: supervisor["Supervisor"],
          supervisorEmail: supervisor["Email"],
          idNumber: supervisor["ID_No"],
          cellNumber: supervisor["Cell_No"],
          mpesaNumber: supervisor["MPESA_No"],
          implementerId: supervisor["Implementer_ID"]
            ? (
                await db.implementer.findUnique({
                  where: { visibleId: supervisor["Implementer_ID"] },
                })
              )?.id
            : null,
          county: supervisor["County"],
          subCounty: supervisor["Sub-County"],
          bankName: supervisor["Bank_Name"],
          bankBranch: supervisor["Bank_Branch"],
          bankAccountName: null,
          bankAccountNumber: supervisor["Bank_Acc_No"],
          kra: supervisor["KRA"],
          nhif: supervisor["NHIF"],
          nssf: supervisor["NSSF"],
          dateOfBirth: supervisor["DOB"],
          gender: supervisor["Gender"],
          trainingLevel: supervisor["Training_Level"],
          droppedOut: Boolean(supervisor["Drop_out"]),
        },
      });
    } catch (error: unknown) {
      console.error(error);
      throw error;
    }
  });
}

async function createFellows(db: Database) {
  console.log("Creating fellows");

  await parseCsvFile("fellow_info", async (fellow: any) => {
    try {
      await db.fellow.create({
        data: {
          id: objectId("fellow"),
          visibleId: fellow["Fellow_ID"],
          fellowName: fellow["Fellow"],
          fellowEmail: fellow["Email"],
          yearOfImplementation: parseInt(fellow["Year_of_imp"]),
          mpesaName: fellow["MPESA Name"],
          mpesaNumber: fellow["MPESA_No"],
          idNumber: fellow["ID_No"],
          cellNumber: fellow["Cell_No"],
          county: fellow["County"],
          subCounty: fellow["Sub-County"],
          dateOfBirth: fellow["DOB"],
          gender: fellow["Gender"],
          droppedOut: Boolean(fellow["Drop_out"]),
          transferred: Boolean(fellow["Transfered"]),
          hubId: (
            await db.hub.findFirst({
              where: { visibleId: fellow["Hub_ID"] },
            })
          )?.id,
          implementerId: (
            await db.implementer.findFirst({
              where: { visibleId: fellow["Implementer_ID"] },
            })
          )?.id,
          supervisorId: fellow["Supervisor_ID"]
            ? (
                await db.supervisor.findFirstOrThrow({
                  where: { visibleId: fellow["Supervisor_ID"] },
                })
              ).id
            : null,
        },
      });
    } catch (error: unknown) {
      console.error("fellow", fellow);
      throw error;
    }
  });
}

async function createInterventionGroupSessions(db: Database) {
  console.log("Creating intervention group sessions");

  const interventionSessions = await db.interventionSession.findMany({
    include: { school: true },
  });

  for (let interventionSession of interventionSessions) {
    const { sessionDate, school } = interventionSession;

    const fellows = await db.fellow.findMany({
      where: { hubId: school.hubId },
    });

    for (let fellow of fellows) {
      await db.interventionGroupSession.create({
        data: {
          id: objectId("igsess"),
          sessionId: interventionSession.id,
          groupName: `${school.schoolName} Group ${fellow.visibleId} ${format(
            sessionDate,
            "yyyy-MM-dd",
          )}`,
          leaderId: fellow.id,
        },
      });
    }
  }
}

async function createFellowAttendances(db: Database) {
  console.log("Creating fellow attendances");

  const groupSessions = await db.interventionGroupSession.findMany({
    include: {
      leader: true,
      session: {
        include: {
          school: true,
        },
      },
    },
  });

  for (let groupSession of groupSessions) {
    if (!groupSession.leader) {
      continue;
    }

    const { hubId } = groupSession.session.school;
    const supervisors = await db.supervisor.findMany({
      where: { hubId },
    });
    const randomSupervisor =
      supervisors[Math.floor(Math.random() * supervisors.length)]!;

    const attended = Math.random() > 0.8;

    await db.fellowAttendance.create({
      data: {
        visibleId: `FA_${groupSession.leader.visibleId}_${groupSession.id}`,
        yearOfImplementation: groupSession.session.yearOfImplementation,
        fellowId: groupSession.leader.id,
        sessionNumber: mapSessionTypeToSessionNumber(
          groupSession.session.sessionType,
        ),
        sessionDate: groupSession.session.sessionDate,
        schoolId: groupSession.session.schoolId,
        supervisorId: randomSupervisor.id,
        attended,
        absenceReason: attended ? null : "Random reason",
        groupSessionId: groupSession.id,
      },
    });
  }
}

async function createStudents(db: Database) {
  console.log("Creating students");

  const schools = await db.school.findMany();

  for (const school of schools) {
    const { hubId } = school;
    const supervisors = await db.supervisor.findMany({
      where: { hubId },
    });
    const randomSupervisor =
      supervisors[Math.floor(Math.random() * supervisors.length)]!;

    const fellows = await db.fellow.findMany({ where: { hubId } });
    const randomFellow = fellows[Math.floor(Math.random() * fellows.length)]!;

    try {
      for (let i = 0; i < 20; i++) {
        const studentName = faker.person.fullName();
        const admissionNumber = `Adm_${school.visibleId}_${i + 1}`;
        await db.student.create({
          data: {
            id: objectId("stu"),
            studentName,
            visibleId: `Stu_${admissionNumber}`,
            fellowId: randomFellow?.id,
            supervisorId: randomSupervisor.id,
            schoolId: school.id,
            yearOfImplementation: randomFellow?.yearOfImplementation,
            admissionNumber,
            age: Math.floor(Math.random() * 10) + 13,
            gender: Math.random() > 0.5 ? "M" : "F",
            form: Math.floor(Math.random() * 4) + 1,
            stream: Math.random() > 0.5 ? "A" : "B",
            condition: Math.random() > 0.5 ? "Intervention" : "Control",
            tribe: Math.random() > 0.5 ? "Kikuyu" : "Luo",
            county: Math.random() > 0.5 ? "Nairobi" : "Kisumu",
            financialStatus: Math.random() > 0.5 ? "Poor" : "Rich",
            home: Math.random() > 0.5 ? "Home" : "Boarding",
            siblings: Math.random() > 0.5 ? "Yes" : "No",
            religion: Math.random() > 0.5 ? "Christian" : "Muslim",
            groupName: Math.random() > 0.5 ? "Group 1" : "Group 2",
            survivingParents: Math.random() > 0.5 ? "Yes" : "No",
            parentsDead: Math.random() > 0.5 ? "Yes" : "No",
            fathersEducation: Math.random() > 0.5 ? "Primary" : "Secondary",
            mothersEducation: Math.random() > 0.5 ? "Primary" : "Secondary",
            coCurricular: Math.random() > 0.5 ? "Yes" : "No",
            sports: Math.random() > 0.5 ? "Yes" : "No",
            isClinicalCase: Math.random() > 0.5,
          },
        });
      }
    } catch (error) {
      console.error({ randomSupervisor, randomFellow, school });
      throw error;
    }
  }
}

async function createFixtures(db: Database) {
  console.log("Creating fixtures");

  const supervisors = await db.supervisor.findMany({
    include: {
      hub: {
        include: {
          schools: true,
        },
      },
    },
  });

  // Assign a school to each supervisor
  for (let supervisor of supervisors) {
    if (supervisor.hub) {
      const { schools } = supervisor.hub;
      const randomSchool = schools[Math.floor(Math.random() * schools.length)];
      await db.supervisor.update({
        where: { id: supervisor.id },
        data: { assignedSchoolId: randomSchool?.id },
      });
    }
  }

  let stDominic = await db.school.findUnique({
    where: { visibleId: "ANS23_School_3" },
    include: { hub: true },
  });
  const supervisorMichelle = await db.supervisor.update({
    where: { visibleId: "SPV23_S_25" },
    data: { assignedSchoolId: stDominic?.id },
  });

  const data = [
    {
      subtype: "material",
      session: "s02",
      destination: "school",
      amount: 500,
      date: new Date("March 12, 2023"),
    },
    {
      subtype: "self",
      session: "fu02",
      destination: "hub",
      amount: 374,
      date: new Date("April 10, 2023"),
    },
    {
      subtype: "self",
      session: "dcfu02",
      destination: "main_office",
      amount: 128,
      date: new Date("May 08, 2023"),
    },
    {
      subtype: "self",
      session: "cfu01",
      destination: "supervision_location",
      amount: 128,
      date: new Date("May 08, 2023"),
    },
  ].map((reimbursement) => ({
    id: objectId("reim"),
    supervisorId: supervisorMichelle.id,
    hubId: stDominic!.hubId!,
    hubCoordinatorId: stDominic!.hub!.coordinatorId!,
    incurredAt: reimbursement.date,
    amount: reimbursement.amount,
    kind: "transport",
    mpesaName:
      supervisorMichelle!.mpesaName ||
      supervisorMichelle!.supervisorName ||
      "N/A",
    mpesaNumber: supervisorMichelle!.mpesaNumber || "N/A",
    details: {
      subtype: reimbursement.subtype,
      session: reimbursement.session,
      receiptUrl: "https://example.com/uber.pdf",
    },
  }));

  await db.reimbursementRequest.createMany({
    data,
  });
}

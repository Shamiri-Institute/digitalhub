import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";
import { parseEuropeanDate } from "#/lib/utils";
import { fixtures } from "#/prisma/scripts/fixtures";
import { parseCsvFile } from "#/prisma/scripts/utils";
import { PrismaAdapter } from "@next-auth/prisma-adapter";

async function seedDatabase() {
  await truncateTables();
  await createSystemUser(db);
  await createImplementers(db);
  await createUsers(db);
  await createHubs(db);
  await createSchools(db);
  await createSupervisors(db);
  await createFellows(db);
  await createFellowAttendances(db);
  await createStudents(db);
  await createFixtures(db);
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
  await db.$executeRaw`
    TRUNCATE TABLE implementers, implementer_avatars, implementer_invites, implementer_members, files, users, accounts, sessions, verification_tokens, user_avatars, user_recent_opens, hubs, students, student_outcomes, fellows, intervention_sessions, intervention_group_sessions, intervention_session_ratings, intervention_session_notes, fellow_attendances, supervisors, schools, hub_coordinators, reimbursement_requests;
    `;
}

async function createSystemUser(db: Database) {
  await db.user.create({
    data: {
      id: "system",
      email: "tech+system@shamiri.institute",
      name: "Shamiri System",
    },
  });
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
    console.log({ user });
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

async function createFellowAttendances(db: Database) {
  console.log("Creating fellow attendances");

  await parseCsvFile(
    "fellow_attendance_temp",
    async (fellowAttendance: any) => {
      try {
        const fellowId = (await db.fellow.findFirst({
          where: { visibleId: fellowAttendance["Fellow_ID"] },
        }))!.id!;
        const schoolId = (await db.school.findFirst({
          where: { visibleId: fellowAttendance["School_ID"] },
        }))!.id!;
        const supervisorId = (await db.supervisor.findFirst({
          where: { visibleId: fellowAttendance["Supervisor_ID"] },
        }))!.id!;
        await db.fellowAttendance.create({
          data: {
            visibleId: fellowAttendance["Attendance_ID"],
            fellow: {
              connect: { id: fellowId },
            },
            sessionNumber: parseInt(fellowAttendance["Session"]),
            sessionDate: parseEuropeanDate(fellowAttendance["Date"]) as Date,
            yearOfImplementation: parseInt(fellowAttendance["Year_of_imp"]),
            school: {
              connect: { id: schoolId },
            },
            supervisor: {
              connect: { id: supervisorId },
            },
            attended: Boolean(fellowAttendance["Attendance"]),
            absenceReason: fellowAttendance["Absence_Reason"],
            paymentInitiated: Boolean(fellowAttendance["Payment_Initiated"]),
          },
        });
      } catch (e) {
        throw e;
      }
    },
  );
}

async function createStudents(db: Database) {
  console.log("Creating students");

  // Unlike student_info_legacy, this CSV file export corrects a data entry error.
  // It was not simply downloaded from Airtable like before, but was manually corrected.
  // It includes students with condition NULL (meaning they weren't given an intervention) which were previously excluded in AT.
  // But the additional rows manually added here actually should be included because
  // they were actually given an intervention and are missing because of data entry errors.
  // cc: mmbone@shamiri.institute edmund@agency.fund
  await parseCsvFile("student_info_all", async (student: any) => {
    try {
      await db.student.create({
        data: {
          id: objectId("stu"),
          studentName: student["name"],
          visibleId: student["id"],
          fellowId: student["fellow_id"]
            ? (
                await db.fellow.findFirst({
                  where: { visibleId: student["fellow_id"] },
                })
              )?.id
            : null,
          supervisorId: student["supervisor_id"]
            ? (
                await db.supervisor.findFirst({
                  where: { visibleId: student["supervisor_id"] },
                })
              )?.id
            : null,
          implementerId: (
            await db.implementer.findFirst({
              where: { visibleId: student["implementer_id"] },
            })
          )?.id,
          schoolId: (
            await db.school.findFirst({
              where: { visibleId: student["school_id"] },
            })
          )?.id,
          yearOfImplementation: parseInt(student["year_of_implementation"]),
          admissionNumber: student["admission_number"],
          age: parseInt(student["age"]),
          gender: student["gender"],
          form: parseInt(student["form"]),
          stream: student["stream"],
          condition: student["condition"],
          tribe: student["tribe"],
          county: student["county"],
          financialStatus: student["financial_status"],
          home: student["home"],
          siblings: student["siblings"],
          religion: student["religion"],
          groupName: student["group_name"],
          survivingParents: student["surviving_parents"],
          parentsDead: student["parents_dead"],
          fathersEducation: student["fathers_education"],
          mothersEducation: student["mothers_education"],
          coCurricular: student["co_curricular"],
          sports: student["sports"],
          isClinicalCase: Boolean(student["create_screening_id"]),
        },
      });
    } catch (e) {
      throw e;
    }
  });
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
    const school = randomSchool(supervisor.hub!.schools);
    await db.supervisor.update({
      where: { id: supervisor.id },
      data: { assignedSchoolId: school?.id },
    });
  }

  let stDominic = await db.school.findUnique({
    where: {
      visibleId: "ANS23_School_3",
    },
    include: { hub: true },
  });
  const supervisorMichelle = await db.supervisor.update({
    where: {
      visibleId: "SPV23_S_25",
    },
    data: {
      assignedSchoolId: stDominic?.id,
    },
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

function randomSchool(schools: any[]) {
  return schools[Math.floor(Math.random() * schools.length)];
}

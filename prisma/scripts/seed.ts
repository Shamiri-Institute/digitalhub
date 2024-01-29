import { faker } from "@faker-js/faker";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { ImplementerRole } from "@prisma/client";

import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";
import { userFixtures } from "#/prisma/scripts/fixtures";
import { parseCsvBoolean, parseCsvFile } from "#/prisma/scripts/utils";

async function seedDatabase() {
  await truncateTables();
  await createImplementers(db);
  await createProjects(db);
  await createUsers(db);
  await createHubs(db);
  await createSchools(db);
  await createInterventionSessions(db);
  await createSupervisors(db);
  await createFellows(db);
  await createInterventionGroups(db);
  await createFellowAttendances(db);
  await createStudents(db);
  await createFixtures(db);
  await createOverallEvaluationRatings(db);
  await createFellowComplaints(db);

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
          TRUNCATE TABLE implementers, implementer_avatars, implementer_invites, implementer_members, files, users, accounts, sessions, verification_tokens, user_avatars, user_recent_opens, hubs, projects, project_implementers, students, student_attendances, student_outcomes, fellows, intervention_sessions, intervention_groups, intervention_session_ratings, intervention_session_notes, fellow_attendances, supervisors, schools, school_implementers, hub_coordinators, student_complaints, repayment_requests, reimbursement_requests, overall_fellow_evaluations, fellow_complaints CASCADE;
          `;
}

async function createImplementers(db: Database) {
  console.log("Creating implementers");

  await parseCsvFile("implementer_info", async (implementer: any) => {
    await db.implementer.create({
      data: {
        id: objectId("impl"),
        visibleId: implementer["Implementer_ID"].trim(),
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
  for (let user of userFixtures.users) {
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

async function createProjects(db: Database) {
  console.log("Creating projects");

  await parseCsvFile("projects", async (projectInfo: any) => {
    if (!projectInfo.project_id) {
      console.log("Project found with missing project id. Skipping for now");
      return;
    }

    const project = await db.project.create({
      data: {
        visibleId: (projectInfo.project_id as string).trim(),
        projectLead: projectInfo["project lead"],
        name: (projectInfo.project as string).trim(),
        funder: projectInfo.Funder,
        budget: projectInfo.Budget,
      },
    });

    const implementerIds = (projectInfo["implementer_id"] as string)?.split(
      ",",
    );
    for (let implementerId of implementerIds) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: implementerId },
      });

      await db.projectImplementer.create({
        data: {
          projectId: project.id,
          implementerId: implementer.id,
        },
      });
    }
  });
}

async function createHubs(db: Database) {
  console.log("Creating hubs");

  await parseCsvFile("hub_info", async (hub: any) => {
    const implementer = await db.implementer.findFirstOrThrow({
      where: { visibleId: hub["implementer_id"] },
    });

    const project = await db.project.findFirstOrThrow({
      where: {
        visibleId: hub["project_id"],
      },
    });

    const createdHub = await db.hub.create({
      data: {
        id: objectId("hub"),
        visibleId: hub["Hub_ID"],
        hubName: hub["Hub_Name"],
        implementerId: implementer.id,
        projectId: project.id,
      },
    });

    if (hub["Hub_coordinator_ID"]) {
      await db.hubCoordinator.create({
        data: {
          id: objectId("coord"),
          visibleId: hub["Hub_coordinator_ID"],
          coordinatorName: hub["Hub_coordinator_Name"],
          implementerId: implementer.id,
          assignedHubId: createdHub.id,
        },
      });
    }
  });
}

async function createSchools(db: Database) {
  console.log("Creating schools");

  // TODO: Remove TBC ("To Be Confirmed") schools from database

  await parseCsvFile("school_info", async (schoolInfo: any) => {
    let implementerId: string | undefined;
    if (
      schoolInfo["Implementer_ID"] &&
      !schoolInfo["Implementer_ID"].includes(",")
    ) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: schoolInfo["Implementer_ID"] },
      });
      implementerId = implementer.id;
    }

    let hubId: string | undefined;
    if (schoolInfo["Hub_ID"]) {
      const hub = await db.hub.findUnique({
        where: { visibleId: schoolInfo["Hub_ID"] },
      });
      hubId = hub?.id;
    }

    const school = await db.school.create({
      data: {
        id: objectId("sch"),
        schoolName: schoolInfo["School_Name"],
        schoolType: schoolInfo["School_Type"],
        schoolEmail: schoolInfo["School_email"],
        schoolCounty: schoolInfo["School_County"],
        schoolDemographics: schoolInfo["School_Demographics"],
        visibleId: schoolInfo["School_ID"],
        implementerId: implementerId, // TODO: legacy remove
        hubId: hubId,
        pointPersonName: schoolInfo["Point_Person_Name"],
        pointPersonId: schoolInfo["Point_Person_ID"],
        pointPersonPhone: schoolInfo["Point_Person_Phone"],
        pointPersonEmail: schoolInfo["Point_Person_Email"],
        numbersExpected: parseInt(schoolInfo["Numbers_Expected"]),
        boardingDay: schoolInfo["Boarding_day"],
        longitude: schoolInfo["Longitude"]
          ? parseFloat(schoolInfo["Longitude"])
          : null,
        latitude: schoolInfo["Latitude"]
          ? parseFloat(schoolInfo["Latitude"])
          : null,
        droppedOut: Boolean(schoolInfo["Dropped_Out"]),
      },
    });

    const implementerIds = (schoolInfo["Implementer_ID"] as string)?.split(",");
    for (let implementerId of implementerIds) {
      const implementer = await db.implementer.findFirstOrThrow({
        where: { visibleId: implementerId },
      });

      await db.schoolImplementer.create({
        data: {
          implementerId: implementer.id,
          schoolId: school.id,
        },
      });
    }
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
          implementerId: (
            await db.implementer.findUnique({
              where: { visibleId: supervisor["Implementer_ID"] },
            })
          )?.id!,
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

async function createInterventionGroups(db: Database) {
  console.log("Creating intervention group sessions");

  const interventionSessions = await db.interventionSession.findMany({
    include: {
      school: {
        include: {
          hub: true,
        },
      },
    },
  });

  let fellowIdx = 0;
  for (let interventionSession of interventionSessions) {
    const { school } = interventionSession;

    const fellowsCount = await db.fellow.count({
      where: { hubId: school.hubId },
    });
    for (const idx of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const groupName = `group-${school.visibleId}-X${(idx + 1)
        .toString()
        .padStart(2, "0")}`;

      const fellow = await db.fellow.findFirstOrThrow({
        where: { hubId: school.hubId },
        skip: (fellowIdx + 1) % fellowsCount,
        take: 1,
      });

      await db.interventionGroup.create({
        data: {
          id: objectId("ig"),
          groupName,
          leaderId: fellow.id,
          schoolId: interventionSession.schoolId,
          projectId: interventionSession.school.hub?.projectId || "N/A",
        },
      });

      fellowIdx += 1;
    }
  }
}

async function createFellowAttendances(db: Database) {
  console.log("Creating fellow attendances");

  const schools = await db.school.findMany({
    include: {
      interventionSessions: true,
      interventionGroups: true,
      hub: true,
    },
  });

  for (let school of schools) {
    const { interventionSessions, interventionGroups } = school;

    let fellowIdx = 0;
    for (const session of interventionSessions) {
      for (const group of interventionGroups) {
        const fellowsCount = await db.fellow.count();
        const fellow = await db.fellow.findFirstOrThrow({
          skip: fellowIdx % fellowsCount,
          take: 1,
        });

        if (!fellow.supervisorId) {
          console.log(`Fellow ${fellow.visibleId} has no supervisor`);
          continue;
        }

        await db.fellowAttendance.create({
          data: {
            visibleId: `FA_${fellow.visibleId}_${session.id}`,
            projectId: school.hub?.projectId ?? null,
            fellowId: fellow.id,
            schoolId: school.id,
            supervisorId: fellow.supervisorId,
            attended: fellowIdx % 0 == 1 ? true : false,
            absenceReason: fellowIdx % 0 == 1 ? null : "Random reason",
            sessionId: session.id,
            groupId: group.id,
          },
        });

        fellowIdx += 1;
      }
    }
  }
}

async function createStudents(db: Database) {
  console.log("Creating students");

  const schools = await db.school.findMany();

  let supervisorIdx = 0;
  let fellowIdx = 0;
  for (const school of schools) {
    const { hubId } = school;
    if (!hubId) {
      continue;
    }

    const supervisorCount = await db.supervisor.count({ where: { hubId } });
    const supervisor = await db.supervisor.findFirstOrThrow({
      where: { hubId },
      skip: (supervisorIdx + 1) % supervisorCount,
      take: 1,
    });

    const fellowCount = await db.fellow.count({ where: { hubId } });
    const fellow = await db.fellow.findFirstOrThrow({
      where: { hubId },
      skip: (fellowIdx + 1) % fellowCount,
      take: 1,
    });

    try {
      for (let i = 0; i < 20; i++) {
        const admissionNumber = `Adm_${school.visibleId}_${i + 1}`;
        const studentName = `Student ${i}`;
        await db.student.create({
          data: {
            id: objectId("stu"),
            studentName,
            visibleId: `Stu_${admissionNumber}`,
            fellowId: fellow.id,
            supervisorId: supervisor.id,
            schoolId: school.id,
            yearOfImplementation: fellow.yearOfImplementation,
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

        fellowIdx += 1;
        supervisorIdx += 1;
      }
    } catch (error) {
      throw error;
    }
  }
}

async function createFixtures(db: Database) {
  console.log("Creating fixtures");

  for (let userFixture of userFixtures.users) {
    if (userFixture.identifier) {
      const user = await db.user.findUniqueOrThrow({
        where: { email: userFixture.email },
        include: { memberships: true },
      });

      if (userFixture.implementerRole === ImplementerRole.SUPERVISOR) {
        const supervisor = await db.supervisor.findUniqueOrThrow({
          where: { visibleId: userFixture.identifier },
        });

        const [membership] = user.memberships;
        if (!membership) {
          throw new Error(`User ${user.email} has no membership`);
        }

        await db.implementerMember.update({
          where: { id: membership.id, userId: user.id },
          data: { identifier: supervisor.id },
        });
      }

      if (userFixture.implementerRole === ImplementerRole.HUB_COORDINATOR) {
        const hubCoordinator = await db.hubCoordinator.findUniqueOrThrow({
          where: { visibleId: userFixture.identifier },
        });

        const [membership] = user.memberships;
        if (!membership) {
          throw new Error(`User ${user.email} has no membership`);
        }

        await db.implementerMember.update({
          where: { id: membership.id, userId: user.id },
          data: { identifier: hubCoordinator.id },
        });
      }
    }
  }

  const supervisors = await db.supervisor.findMany({
    include: {
      hub: {
        include: {
          schools: true,
        },
      },
    },
  });

  // Assign a school to each supervisor in a deterministic way
  for (let i = 0; i < supervisors.length; i++) {
    const supervisor = supervisors[i];
    if (supervisor?.hub) {
      const { schools } = supervisor.hub;
      const assignedSchool = schools[i % schools.length]!;
      await db.school.update({
        where: { id: assignedSchool.id },
        data: { assignedSupervisorId: supervisor.id },
      });
    }
  }

  let supervisorMichelle = await db.supervisor.findUniqueOrThrow({
    where: { visibleId: "SPV23_S_25" },
  });
  const stDominic = await db.school.update({
    where: { visibleId: "ANS23_School_3" },
    data: { assignedSupervisorId: supervisorMichelle?.id },
    include: {
      hub: {
        include: {
          coordinators: true,
        },
      },
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
    hubId: stDominic.hubId!,
    hubCoordinatorId: stDominic!.hub!.coordinators[0]!.id,
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
      receiptFileKey: "https://s3.example.com/uber.pdf",
    },
  }));

  await db.reimbursementRequest.createMany({
    data,
  });
}

async function createOverallEvaluationRatings(db: Database) {
  console.log("Adding overall evaluation ratings");
  const fellows = await db.fellow.findMany();

  const data = [];
  for (const fellow of fellows) {
    if (fellow.supervisorId) {
      data.push({
        supervisorId: fellow.supervisorId,
        fellowId: fellow.id,
        fellowBehaviourNotes: faker.lorem.paragraph(3),
        programDeliveryNotes: faker.lorem.paragraph(3),
        dressingAndGroomingNotes: faker.lorem.paragraph(3),
        attendanceNotes: faker.lorem.paragraph(3),
      });
    }
  }
  await db.overallFellowEvaluation.createMany({ data });
}

async function createFellowComplaints(db: Database) {
  const supervisors = await db.supervisor.findMany({
    include: {
      fellows: true,
    },
  });

  const data = [];
  for (const supervisor of supervisors.slice(0, 4)) {
    for (const fellow of supervisor.fellows.slice(0, 4)) {
      data.push({
        complaint: faker.lorem.paragraph(3),
        fellowId: fellow.id,
        supervisorId: supervisor.id,
      });
    }
  }

  await db.fellowComplaints.createMany({ data });
}

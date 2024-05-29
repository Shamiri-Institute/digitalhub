import { ImplementerRole, Prisma, SessionStatus } from "@prisma/client";
import { addDays, addHours, setHours, setMinutes } from "date-fns";

import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";

const ids = {
  implementers: {
    SHAMIRI: {
      id: objectId("impl"),
      visibleId: "SHA",
      implementerName: "Shamiri Institute",
      implementerType: "NNGO",
      implementerAddress:
        "13th Floor, Pioneer Point (CMS-Africa)\nChania Avenue, Nairobi, Kenya",
      pointPersonName: "Tom Osborn",
      pointPersonPhone: "+254 (0) 11 254 0760",
      pointPersonEmail: "team@shamiri.institute",
      countyOfOperation: "Nairobi",

      projects: {
        "2024P2_Project_1": {
          id: "2024P2_Project_1",
          visibleId: "2024P2_Project_1",
          projectName: "Anansi 100K Phase 2",

          hubs: {
            "24_Hub_01": {
              id: objectId("hub"),
              visibleId: "24_Hub_01",
              hubName: "Dagoretti/Westlands",

              coordinator: {
                id: objectId("hc"),
                visibleId: "24_HC_01",
                coordinatorName: "Perez Ambala",
                coordinatorEmail: "perez.ambala@shamiri.institute",
              },

              supervisors: {
                SPV24_S_01: {
                  id: objectId("sup"),
                  visibleId: "SPV24_S_01",
                  supervisorName: "James Kariuki",
                  supervisorEmail: "james.kariuki@example.com",
                  idNumber: "200100200",
                  cellNumber: "+254700000003",
                  mpesaName: "James Kariuki",
                  mpesaNumber: "+254700000003",
                  county: "Nairobi",
                  subCounty: "Westlands",
                  dateOfBirth: new Date("1975-04-20"),
                  gender: "Male",
                },
                SPV24_S_02: {
                  id: objectId("sup"),
                  visibleId: "SPV24_S_02",
                  supervisorName: "Mary Wanjiku",
                  supervisorEmail: "mary.wanjiku@example.com",
                  idNumber: "200200300",
                  cellNumber: "+254700000004",
                  mpesaName: "Mary Wanjiku",
                  mpesaNumber: "+254700000004",
                  county: "Kiambu",
                  subCounty: "Thika",
                  dateOfBirth: new Date("1980-08-15"),
                  gender: "Female",
                },
                SPV24_S_03: {
                  id: objectId("sup"),
                  visibleId: "SPV24_S_03",
                  supervisorName: "Ian Nene",
                  supervisorEmail: "ian.nene@example.com",
                  idNumber: "200200300",
                  cellNumber: "+2547232000004",
                  mpesaName: "Ian Nene",
                  mpesaNumber: "+2547232000004",
                  county: "Migori",
                  subCounty: "Awendo",
                  dateOfBirth: new Date("1980-08-15"),
                  gender: "Male",
                },
              },

              fellows: {
                TFW24_S_01: {
                  id: objectId("fel"),
                  visibleId: "TFW24_S_01",
                  fellowName: "John Doe",
                  fellowEmail: "johndoe@example.com",
                  mpesaName: "John Doe",
                  mpesaNumber: "+254700000001",
                  idNumber: "12345678",
                  cellNumber: "+254700000001",
                  county: "Nairobi",
                  subCounty: "Westlands",
                  dateOfBirth: new Date("1999-01-01"),
                  gender: "Male",
                  supervisorVisibleId: "SPV24_S_01",
                },
                TFW24_S_02: {
                  id: objectId("fel"),
                  visibleId: "TFW24_S_02",
                  fellowName: "Jane Doe",
                  fellowEmail: "janedoe@example.com",
                  mpesaName: "Jane Doe",
                  mpesaNumber: "+254700000002",
                  idNumber: "87654321",
                  cellNumber: "+254700000002",
                  county: "Nairobi",
                  subCounty: "Dagoretti",
                  dateOfBirth: new Date("2000-02-02"),
                  gender: "Female",
                  supervisorVisibleId: "SPV24_S_02",
                },
                TFW24_S_03: {
                  id: objectId("fel"),
                  visibleId: "TFW24_S_03",
                  fellowName: "Ian Doe",
                  fellowEmail: "janedoe@example.com",
                  mpesaName: "Ian Doe",
                  mpesaNumber: "+254700000002",
                  idNumber: "87654321",
                  cellNumber: "+254700000002",
                  county: "Nairobi",
                  subCounty: "Dagoretti",
                  dateOfBirth: new Date("2000-02-02"),
                  gender: "Female",
                  supervisorVisibleId: "SPV24_S_03",
                },
              },

              schools: {
                ANS24_School_07: {
                  id: objectId("sch"),
                  visibleId: "ANS24_School_07",
                  schoolName: "Dagoretti High School",
                  schoolType: "National",
                  schoolEmail: "dagoretti@example.com",
                  schoolCounty: "Nairobi",
                  schoolDemographics: "Boys",
                  pointPersonId: "746229367",
                  pointPersonName: "Ephantus Kiura Muriuki",
                  pointPersonPhone: "+254 722 229 367",
                  numbersExpected: 2200,
                  principalName: "L. O. Nyachwera",
                  assignedSupervisorVisibleId: "SPV24_S_03",

                  groups: {
                    ANS24_Group_01: {
                      id: "07G1",
                      groupName: "G1",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Group_02: {
                      id: "07G2",
                      groupName: "G2",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Group_03: {
                      id: "07G3",
                      groupName: "G3",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Group_04: {
                      id: "07G4",
                      groupName: "G4",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Group_05: {
                      id: "07G5",
                      groupName: "G5",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                    ANS24_Group_06: {
                      id: "07G6",
                      groupName: "G6",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                  },

                  sessions: {
                    Session_01: {
                      id: objectId("sess"),
                      sessionType: "s0",
                      sessionName: "Presession",
                      sessionDate: setMinutes(addDays(new Date(), -1), 0),
                      sessionEndTime: addHours(
                        setMinutes(addDays(new Date(), -1), 0),
                        2,
                      ),
                      sessionRating: 4,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_02: {
                      id: objectId("sess"),
                      sessionType: "s1",
                      sessionName: "Session 01",
                      sessionDate: setMinutes(addDays(new Date(), 0), 0),
                      sessionEndTime: addHours(
                        setMinutes(addDays(new Date(), 0), 0),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                  },

                  students: {
                    ANS24_07_Stu_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_07_Stu_01",
                      studentName: "Alice Mwangi",
                      admissionNumber: "ADM123",
                      age: 17,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                      assignedGroupId: "07G1",
                    },
                    ANS24_07_Stu_02: {
                      id: objectId("stu"),
                      visibleId: "ANS24_07_Stu_02",
                      studentName: "Bob Otieno",
                      admissionNumber: "ADM124",
                      age: 16,
                      gender: "M",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_01",
                      assignedGroupId: "07G1",
                    },
                    ANS24_07_Stu_03: {
                      id: objectId("stu"),
                      visibleId: "ANS24_07_Stu_03",
                      studentName: "Caroline Njeri",
                      admissionNumber: "ADM125",
                      age: 15,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "07G1",
                    },
                    ANS24_07_Stu_04: {
                      id: objectId("stu"),
                      visibleId: "ANS24_07_Stu_04",
                      studentName: "David Kimani",
                      admissionNumber: "ADM126",
                      age: 14,
                      gender: "M",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "07G1",
                    },
                  },

                  fellowAttendances: {
                    FA_1: {
                      visibleId: "FA_1",
                      session: "Session_01",
                      fellowId: "TFW24_S_01",
                      supervisorId: "SPV24_S_01",
                      attended: true,
                      groupId: "07G1",
                      delayedPayments: [],
                      repaymentRequests: [
                        {
                          id: "RR_1",
                        },
                      ],
                    },
                    FA_2: {
                      visibleId: "FA_2",
                      session: "Session_02",
                      fellowId: "TFW24_S_01",
                      supervisorId: "SPV24_S_01",
                      attended: true,
                      groupId: "07G1",
                      delayedPayments: [],
                      repaymentRequests: [],
                    },
                    FA_3: {
                      visibleId: "FA_3",
                      session: "Session_01",
                      fellowId: "TFW24_S_02",
                      supervisorId: "SPV24_S_01",
                      attended: true,
                      groupId: "07G2",
                      delayedPayments: [],
                      repaymentRequests: [],
                    },
                  },

                  payoutReconciliations: {},
                },

                ANS24_School_09: {
                  id: objectId("sch"),
                  visibleId: "ANS24_School_09",
                  schoolName: "Beth Mugo High School",
                  schoolType: "Sub county",
                  schoolEmail: "bethmugo@example.com",
                  schoolCounty: "Nairobi",
                  schoolDemographics: "Mixed",
                  pointPersonId: "721296099",
                  pointPersonName: "Tabitha Matara",
                  pointPersonPhone: "N/A",
                  numbersExpected: 1000,
                  principalName: "Emily W. Masele",
                  assignedSupervisorVisibleId: "SPV24_S_01",

                  groups: {
                    ANS24_Group_01: {
                      id: "09G1",
                      groupName: "G1",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                  },

                  sessions: {
                    Session_01: {
                      id: objectId("sess"),
                      sessionType: "s0",
                      status: SessionStatus.Cancelled,
                      sessionName: "Presession",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), -1), 0),
                        6,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), -1), 0), 6),
                        2,
                      ),
                      sessionRating: 4,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_02: {
                      id: objectId("sess"),
                      sessionType: "s1",
                      sessionName: "Session 01",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), -1), 0),
                        8,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), -1), 0), 8),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_03: {
                      id: objectId("sess"),
                      sessionType: "s2",
                      sessionName: "Session 02",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 7), 0),
                        8,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 7), 0), 8),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_04: {
                      id: objectId("sess"),
                      sessionType: "s3",
                      sessionName: "Session 03",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 11), 0),
                        1,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 11), 0), 1),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_05: {
                      id: objectId("sess"),
                      sessionType: "s4",
                      sessionName: "Session 04",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 12), 0),
                        1,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 12), 0), 1),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                  },

                  students: {
                    ANS24_09_Stu_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_09_Stu_01",
                      studentName: "Alice Mwangi",
                      admissionNumber: "ADM123",
                      age: 17,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "09G1",
                    },
                    ANS24_09_Stu_02: {
                      id: objectId("stu"),
                      visibleId: "ANS24_09_Stu_02",
                      studentName: "Otieno Mwangi",
                      admissionNumber: "ADM153",
                      age: 19,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_03",
                      assignedGroupId: null,
                    },
                  },

                  fellowAttendances: {},

                  payoutReconciliations: {},
                },

                ANS24_School_10: {
                  id: objectId("sch"),
                  visibleId: "ANS24_School_10",
                  schoolName: "Jamhuri High School",
                  schoolType: "Extra county",
                  schoolEmail: "jamhuri@example.com",
                  schoolCounty: "Nairobi",
                  schoolDemographics: "Boys",
                  pointPersonId: "000",
                  pointPersonName: "Dennis Ondari",
                  pointPersonPhone: "718312099/0735520758",
                  numbersExpected: 674,
                  principalName: "Duncan Juma",
                  assignedSupervisorVisibleId: "SPV24_S_02",

                  groups: {
                    ANS24_Group_01: {
                      id: "10G1",
                      groupName: "G1",
                      groupFellowVisibleId: "TFW24_S_01",
                    },
                  },

                  sessions: {
                    Session_01: {
                      id: objectId("sess"),
                      sessionType: "s0",
                      status: SessionStatus.Cancelled,
                      sessionName: "Presession",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), -7), 0),
                        15,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), -7), 0), 15),
                        1.5,
                      ),
                      sessionRating: 4,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_02: {
                      id: objectId("sess"),
                      sessionType: "s1",
                      sessionName: "Session 01",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 0), 0),
                        15,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 0), 0), 15),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_03: {
                      id: objectId("sess"),
                      sessionType: "s2",
                      sessionName: "Session 02",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 7), 0),
                        17,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 7), 0), 17),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_04: {
                      id: objectId("sess"),
                      sessionType: "s3",
                      sessionName: "Session 03",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 11), 0),
                        18,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 11), 0), 18),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                    Session_05: {
                      id: objectId("sess"),
                      sessionType: "s4",
                      sessionName: "Session 04",
                      sessionDate: setHours(
                        setMinutes(addDays(new Date(), 12), 0),
                        18,
                      ),
                      sessionEndTime: addHours(
                        setHours(setMinutes(addDays(new Date(), 12), 0), 18),
                        1.5,
                      ),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_01",
                    },
                  },

                  students: {
                    ANS24_10_Stu_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_10_Stu_01",
                      studentName: "Daina Kathambi",
                      admissionNumber: "ADM123",
                      age: 17,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "10G1",
                    },
                  },

                  fellowAttendances: {
                    FA_11: {
                      visibleId: "FA_11",
                      session: "Session_01",
                      fellowId: "TFW24_S_01",
                      supervisorId: "SPV24_S_01",
                      attended: true,
                      groupId: "10G1",
                      delayedPayments: [
                        {
                          id: "DPR_1",
                        },
                      ],
                      repaymentRequests: [],
                    },
                  },

                  payoutReconciliations: {
                    PR_1: {
                      amount: 100,
                      fellowId: "TFW24_S_01",
                    },
                  },
                },

                ANS24_School_08: {
                  id: objectId("sch"),
                  visibleId: "ANS24_School_08",
                  schoolName: "Buruburu High School",
                  schoolType: "National",
                  schoolEmail: "buruburu@example.com",
                  schoolCounty: "Nairobi",
                  schoolDemographics: "Boys",
                  pointPersonId: "746229367",
                  pointPersonName: "Joseph Mwangi",
                  pointPersonPhone: "+254 722 229 229",
                  numbersExpected: 220,
                  principalName: "Amazing principal",
                  assignedSupervisorVisibleId: "SPV24_S_02",

                  groups: {
                    ANS24_Group_01: {
                      id: "G11",
                      groupName: "G1",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Group_02: {
                      id: "G12",
                      groupName: "G2",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Group_03: {
                      id: "G13",
                      groupName: "G3",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Group_04: {
                      id: "G14",
                      groupName: "G4",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Group_05: {
                      id: "G15",
                      groupName: "G5",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                    ANS24_Group_06: {
                      id: "G16",
                      groupName: "G6",
                      groupFellowVisibleId: "TFW24_S_02",
                    },
                  },

                  sessions: {
                    Session_01: {
                      id: objectId("sess"),
                      sessionType: "s0",
                      sessionName: "Presession",
                      sessionDate: new Date("2024-04-16"),
                      sessionRating: 4,
                      supervisorVisibleId: "SPV24_S_02",
                    },
                    Session_02: {
                      id: objectId("sess"),
                      sessionType: "s1",
                      sessionName: "Session 01",
                      sessionDate: new Date("2024-05-15"),
                      sessionRating: 5,
                      supervisorVisibleId: "SPV24_S_02",
                    },
                  },

                  students: {
                    ANS24_Stu_01: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_05",
                      studentName: "Alice Mwangi",
                      admissionNumber: "ADM123",
                      age: 17,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "G11",
                    },
                    ANS24_Stu_02: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_06",
                      studentName: "Bob Otieno",
                      admissionNumber: "ADM124",
                      age: 16,
                      gender: "M",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "G11",
                    },
                    ANS24_Stu_03: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_07",
                      studentName: "Caroline Njeri",
                      admissionNumber: "ADM125",
                      age: 15,
                      gender: "F",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "G11",
                    },
                    ANS24_Stu_04: {
                      id: objectId("stu"),
                      visibleId: "ANS24_Stu_08",
                      studentName: "David Kimani",
                      admissionNumber: "ADM126",
                      age: 14,
                      gender: "M",
                      condition: "Shamiri",
                      fellowVisibleId: "TFW24_S_02",
                      assignedGroupId: "G11",
                    },
                  },

                  fellowAttendances: {},

                  payoutReconciliations: {},
                },
              },
            },
          },
        },
      },

      users: {
        edmund: {
          id: objectId("user"),
          email: "edmund@shamiri.institute",
          role: ImplementerRole.HUB_COORDINATOR,
          roleByVisibleId: "24_HC_01",
        },
        benny: {
          id: objectId("user"),
          email: "benny@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
        },
        shadrack: {
          id: objectId("user"),
          email: "shadrack.lilan@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
        },
        davis: {
          id: objectId("user"),
          email: "wambugu.davis@shamiri.institute",
          role: ImplementerRole.SUPERVISOR,
          roleByVisibleId: "SPV24_S_01",
        },
      },
    },
  },
};

async function seedDatabase() {
  await truncateTables();

  for (const implementer of Object.values(ids.implementers)) {
    await db.implementer.create({
      data: {
        id: implementer.id,
        visibleId: implementer.visibleId,
        implementerName: implementer.implementerName,
        implementerType: implementer.implementerType,
        implementerAddress: implementer.implementerAddress,
        pointPersonName: implementer.pointPersonName,
        pointPersonPhone: implementer.pointPersonPhone,
        pointPersonEmail: implementer.pointPersonEmail,
        countyOfOperation: implementer.countyOfOperation,
      },
    });

    for (const project of Object.values(implementer.projects)) {
      const createdProject = await db.project.create({
        data: {
          id: project.id,
          visibleId: project.visibleId,
          name: project.projectName,
        },
      });

      await db.projectImplementer.create({
        data: {
          implementerId: implementer.id,
          projectId: createdProject.id,
        },
      });

      for (const hub of Object.values(project.hubs)) {
        const createdHub = await db.hub.create({
          data: {
            id: hub.id,
            visibleId: hub.visibleId,
            hubName: hub.hubName,
            implementerId: implementer.id, // TODO: remove; projectImplementer replaces this
            projectId: createdProject.id,
          },
        });

        const { coordinator } = hub;
        await db.hubCoordinator.create({
          data: {
            id: coordinator.id,
            implementerId: implementer.id,
            assignedHubId: createdHub.id,
            visibleId: coordinator.visibleId,
            coordinatorName: coordinator.coordinatorName,
            coordinatorEmail: coordinator.coordinatorEmail,
          },
        });

        for (const supervisor of Object.values(hub.supervisors)) {
          await db.supervisor.create({
            data: {
              id: supervisor.id,
              visibleId: supervisor.visibleId,
              supervisorName: supervisor.supervisorName,
              supervisorEmail: supervisor.supervisorEmail,
              idNumber: supervisor.idNumber,
              cellNumber: supervisor.cellNumber,
              mpesaName: supervisor.mpesaName,
              mpesaNumber: supervisor.mpesaNumber,
              county: supervisor.county,
              subCounty: supervisor.subCounty,
              dateOfBirth: supervisor.dateOfBirth,
              gender: supervisor.gender,
              implementerId: implementer.id,
              hubId: createdHub.id,
            },
          });
        }

        for (const fellow of Object.values(hub.fellows)) {
          const createdSupervisor = await db.supervisor.findUniqueOrThrow({
            where: {
              visibleId: fellow.supervisorVisibleId,
            },
          });

          await db.fellow.create({
            data: {
              id: fellow.id,
              visibleId: fellow.visibleId,
              implementerId: implementer.id,
              fellowName: fellow.fellowName,
              fellowEmail: fellow.fellowEmail,
              mpesaName: fellow.mpesaName,
              mpesaNumber: fellow.mpesaNumber,
              idNumber: fellow.idNumber,
              cellNumber: fellow.cellNumber,
              county: fellow.county,
              subCounty: fellow.subCounty,
              dateOfBirth: fellow.dateOfBirth,
              gender: fellow.gender,
              hubId: createdHub.id,
              supervisorId: createdSupervisor.id,
            },
          });
        }

        for (const school of Object.values(hub.schools)) {
          const createdSchool = await db.school.create({
            data: {
              id: school.id,
              visibleId: school.visibleId,
              schoolName: school.schoolName,
              schoolType: school.schoolType,
              schoolEmail: school.schoolEmail,
              schoolCounty: school.schoolCounty,
              schoolDemographics: school.schoolDemographics,
              pointPersonId: school.pointPersonId,
              pointPersonName: school.pointPersonName,
              pointPersonPhone: school.pointPersonPhone,
              numbersExpected: school.numbersExpected,
              principalName: school.principalName,
              hub: {
                connect: { id: createdHub.id },
              },
              implementer: {
                connect: { id: implementer.id },
              },
              assignedSupervisor: {
                connect: { visibleId: school.assignedSupervisorVisibleId },
              },
            },
          });

          for (const session of Object.values(school.sessions)) {
            await db.interventionSession.create({
              data: {
                id: session.id,
                status: (session as any).status,
                sessionType: session.sessionType,
                sessionName: session.sessionName,
                sessionDate: session.sessionDate,
                occurred: true,
                yearOfImplementation: session.sessionDate.getFullYear(),
                school: {
                  connect: { id: createdSchool.id },
                },
                project: {
                  connect: { id: createdProject.id },
                },
              },
            });
          }

          for (const group of Object.values(school.groups)) {
            await db.interventionGroup.create({
              data: {
                id: group.id,
                groupName: group.groupName,
                leader: {
                  connect: { visibleId: group.groupFellowVisibleId },
                },
                project: {
                  connect: { id: createdProject.id },
                },
                school: {
                  connect: { id: createdSchool.id },
                },
              },
            });
          }

          for (const student of Object.values(school.students)) {
            await db.student.create({
              data: {
                id: student.id,
                visibleId: student.visibleId,
                studentName: student.studentName,
                admissionNumber: student.admissionNumber,
                age: student.age,
                gender: student.gender,
                condition: student.condition,
                fellow: {
                  connect: {
                    visibleId: student.fellowVisibleId,
                  },
                },
                school: {
                  connect: { id: createdSchool.id },
                },
                assignedGroup: student.assignedGroupId
                  ? {
                      connect: { id: student.assignedGroupId },
                    }
                  : undefined,
              },
            });
          }

          for (const fellowAttendance of Object.values(
            school.fellowAttendances,
          )) {
            const fellow = await db.fellow.findUniqueOrThrow({
              where: {
                visibleId: fellowAttendance.fellowId,
              },
            });

            const supervisor = await db.supervisor.findUniqueOrThrow({
              where: {
                visibleId: fellowAttendance.supervisorId,
              },
            });

            // @ts-ignore
            const session = school.sessions[fellowAttendance.session];
            await db.fellowAttendance.create({
              data: {
                visibleId: fellowAttendance.visibleId,
                sessionId: session.id,
                fellowId: fellow.id,
                supervisorId: supervisor.id,
                attended: true,
                groupId: fellowAttendance.groupId,
                schoolId: school.id,
                delayedPaymentRequests: {
                  create: fellowAttendance.delayedPayments.map(() => {
                    return {
                      fellowId: fellow.id,
                      supervisorId: supervisor.id,
                      interventionSessionId: session.id,
                    };
                  }),
                },
                repaymentRequests: {
                  create: fellowAttendance.repaymentRequests.map(() => {
                    return {
                      fellowId: fellow.id,
                      supervisorId: supervisor.id,
                      hubId: hub.id,
                    };
                  }),
                },
              },
            });
          }

          for (const payoutReconciliation of Object.values(
            school.payoutReconciliations,
          )) {
            const fellow = await db.fellow.findUniqueOrThrow({
              where: {
                visibleId: payoutReconciliation.fellowId,
              },
            });
            // @ts-ignore
            // const session = school.sessions[fellowAttendance.session];
            await db.payoutReconciliation.create({
              data: {
                amount: payoutReconciliation.amount,
                fellowId: fellow.id,
              },
            });
          }
        }
      }
    }

    for (const user of Object.values(implementer.users)) {
      let personnel:
        | Prisma.SupervisorGetPayload<{}>
        | Prisma.HubCoordinatorGetPayload<{}>
        | null = null;

      if (user.role === ImplementerRole.SUPERVISOR) {
        personnel = await db.supervisor.findUniqueOrThrow({
          where: {
            visibleId: user.roleByVisibleId,
          },
        });
      } else if (user.role === ImplementerRole.HUB_COORDINATOR) {
        personnel = await db.hubCoordinator.findUniqueOrThrow({
          where: {
            visibleId: user.roleByVisibleId,
          },
        });
      } else {
        throw new Error(`Unhandled role: ${(user as any).role}`);
      }

      await db.user.create({
        data: {
          id: user.id,
          email: user.email,
          memberships: {
            create: {
              implementerId: implementer.id,
              role: user.role,
              identifier: personnel.id,
            },
          },
        },
      });
    }
  }

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

  const excludedTables = ["_prisma_migrations"];

  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT IN (${excludedTables.map((table) => `'${table}'`).join(", ")});
  `;

  if (tables.length > 0) {
    const truncateCommand = `TRUNCATE TABLE ${tables.map((t) => `"${t.table_name}"`).join(", ")} CASCADE;`;
    await db.$executeRawUnsafe(truncateCommand);
    console.log("Selected tables truncated successfully.");
  } else {
    console.log(
      "No tables to truncate. Make sure to run `npm run db:dev:migrate` first.",
    );
  }
}

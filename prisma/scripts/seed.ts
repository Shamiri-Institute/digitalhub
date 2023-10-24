import { objectId } from "#/lib/crypto";
import { Database, db } from "#/lib/db";

async function seedDatabase() {
  await truncateTables();
  await createSystemUser(db);
  await createImplementers(db);
  // await createPermissions(db);
  // await createRoles(db);
  // await createUsers(db);
  await createHubs(db);
  await createSchools(db);
  await createFellows(db);
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
  TRUNCATE TABLE implementers, implementer_avatars, implementer_invites, implementer_members, files, users, accounts, sessions, verification_tokens, user_avatars, roles, member_roles, permissions, role_permissions, user_recent_opens, member_permissions, hubs, students, fellows, supervisors, schools, hub_coordinators;
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

  const implementers = await parseCsvFile("implementer_info");
  for (let implementer of implementers) {
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
  }
}

// async function createPermissions(db: Database) {
//   for (let permission of fixtures.permissions) {
//     await db.permission.create({
//       data: {
//         permissionLabel: permission,
//       },
//     });
//   }
// }

// async function createRoles(db: Database) {
//   for (let roleFixture of fixtures.roles) {
//     const role = await db.role.create({
//       data: {
//         id: roleFixture.roleId,
//         name: roleFixture.roleName,
//         description: roleFixture.roleDescription,
//       },
//     });

//     for (let permissionFixture of roleFixture.permissions) {
//       const permission = await db.permission.findFirstOrThrow({
//         where: { permissionLabel: permissionFixture },
//       });

//       await db.rolePermission.create({
//         data: {
//           roleId: role.id,
//           permissionId: permission.id,
//         },
//       });
//     }
//   }
// }

// async function createUsers(db: Database) {
//   const onboard = new OnboardUserCommand(db);
//   for (let { implementorByEmail, ...user } of fixtures.users) {
//     const implementor = await db.implementor.findFirstOrThrow({
//       where: { contactEmail: implementorByEmail },
//     });

//     const response = await onboard.run({
//       email: user.email,
//       name: user.name,
//       implementorId: implementor.id,
//       inviterId: "system",
//       role: user.implementorRole,
//       avatarUrl: user.avatarUrl ?? undefined,
//     });

//     if (user.account) {
//       await db.account.create({
//         data: {
//           type: user.account.type,
//           provider: user.account.provider,
//           providerAccountId: user.account.providerAccountId,
//           userId: response.userId,
//         },
//       });
//     }
//   }
// }

async function createHubs(db: Database) {
  console.log("Creating hubs");

  const hubs = await parseCsvFile("hub_info");
  for (let hub of hubs) {
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
  }
}

async function createSchools(db: Database) {
  console.log("Creating schools");

  const schools = await parseCsvFile("school_info");
  for (let school of schools) {
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
  }
}

async function createFellows(db: Database) {
  console.log("Creating fellows");

  const fellows = await parseCsvFile("fellow_info");
  for (let fellow of fellows) {
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
        // supervisorId: (await db.supervisor.findFirstOrThrow({
        //   where: { visibleId: fellow["Supervisor_ID"] },
        // })).id,
      },
    });
  }
}

/**
 * Loads and parse CSV file in ./data/ directory
 * These CSV files are downloaded from Airtable.
 **/
import * as csv from "csv-parse";
import * as fs from "fs";
import * as path from "path";

async function parseCsvFile(fileName: string): Promise<any[]> {
  return new Promise(async (resolve, reject) => {
    let records: any[] = [];
    const filePath = path.resolve(`./prisma/scripts/airtable/${fileName}.csv`);
    fs.createReadStream(filePath)
      .pipe(csv.parse({ delimiter: ",", columns: true }))
      .on("data", function (row: any) {
        const dataRow = replaceEmptyStringsWithNull(row);
        if (fileName === "school_info") {
          if (dataRow["Implementer_ID"].includes(",")) {
            console.warn(
              `Warning: Implementer_ID contains multiple values (${dataRow["Implementer_ID"]}). Check if this is correct. Truncating to one for now.`,
            );
            dataRow["Implementer_ID"] = dataRow["Implementer_ID"].split(",")[0];
          }
        }

        if (fileName === "implementer_info") {
          if (dataRow["Implementer"] === null) {
            console.warn(
              "Warning: Implementer name is null. Setting to empty string.",
            );
            dataRow["Implementer"] = "";
          }
          if (dataRow["Implementer_Type"] === null) {
            console.warn(
              "Warning: Implementer type is null. Setting to empty string.",
            );
            dataRow["Implementer_Type"] = "";
          }
        }

        records.push(dataRow);
      })
      .on("end", function () {
        resolve(records);
      })
      .on("error", function (error: any) {
        console.log(error.message);
        reject(error);
      });
  });
}

interface GenericObject {
  [key: string]: any;
}

function replaceEmptyStringsWithNull(obj: GenericObject): GenericObject {
  return Object.entries(obj).reduce((newObj: GenericObject, [key, value]) => {
    if (value === "") {
      newObj[key.trim()] = null;
    } else if (typeof value === "object" && value !== null) {
      // If value is an object or an array
      newObj[key.trim()] = replaceEmptyStringsWithNull(value);
    } else {
      newObj[key.trim()] = value;
    }
    return newObj;
  }, {});
}

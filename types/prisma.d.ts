export type SchoolFindUniqueOutput = NonNullable<
  Prisma.PromiseReturnType<typeof db.school.findUnique>
>;

export type FellowWithAttendance = Prisma.FellowGetPayload<{
  include: {
    fellowAttendances: true;
  };
}>;

export type StudentWithFellow = Prisma.StudentGetPayload<{
  include: {
    fellow: true;
  };
}>;

export type StudentWithSchoolAndFellow = Prisma.StudentGetPayload<{
  include: {
    school: true;
    fellow: true;
  };
}>;

type SchoolFindUniqueOutput = NonNullable<
  Prisma.PromiseReturnType<typeof db.school.findUnique>
>;

const fellowInclude = Prisma.validator<Prisma.FellowInclude>()({
  fellowAttendances: true,
});

export type FellowWithAttendance = Prisma.FellowGetPayload<{
  include: typeof fellowInclude;
}>;

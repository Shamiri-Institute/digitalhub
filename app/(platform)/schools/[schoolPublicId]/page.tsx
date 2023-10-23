import { SchoolDemographics } from "#/app/(platform)/schools/[schoolPublicId]/demographics";
import { FellowCreationDialog } from "#/app/(platform)/schools/[schoolPublicId]/fellow-creation-dialog";
import { Icons } from "#/components/icons";

const selectedSchool = {
  demographics: [
    {
      name: "Male",
      value: 10,
    },
    {
      name: "Female",
      value: 40,
    },
  ],
};

export default function SchoolPage({
  params,
}: {
  params: { schoolPublicId: string };
}) {
  const school = {
    name: "Our Lady of Fatima High School",
    totalPopulation: 2200,
    malePopulation: 1000,
    femalePopulation: 1200,
  };

  return (
    <main className="pt-2">
      <Header />
      <div className="relative">
        <SchoolDemographics
          totalPopulation={school.totalPopulation}
          malePopulation={school.malePopulation}
          femalePopulation={school.femalePopulation}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <div className="text-sm">Students</div>
            <div className="text-2xl font-semibold">
              {school.totalPopulation}
            </div>
            <div className="gap flex justify-around">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#B7D4E8]" />
                <div>M</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[#092142]" />
                <div>F</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="my-4">
        <div className="mx-auto flex max-w-[200px] justify-center text-center text-xl font-semibold">
          {school.name}
        </div>
      </div>
      <div className="mx-auto my-4 max-w-[200px]">
        <div className="text-muted-foreground">Sessions</div>
        <div className="mt-1 flex gap-4">
          <div className="h-4 w-4 rounded-full bg-[#85A070]" />
          <div className="h-4 w-4 rounded-full bg-[#85A070]" />
          <div className="h-4 w-4 rounded-full bg-[#85A070]" />
        </div>
      </div>
      <div className="mt-8">
        <div className="mx-4 flex justify-between border-b border-border/50 pb-3">
          <div className="text-2xl font-semibold">My Fellows</div>
          <FellowCreationDialog>
            <button className="transition-transform active:scale-95">
              <Icons.plusCircle
                className="h-6 w-6 text-shamiri-blue"
                strokeWidth={1.5}
              />
            </button>
          </FellowCreationDialog>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex justify-between">
      <div>
        <Icons.chevronLeft className="mr-4 h-6 w-6 align-baseline text-brand" />
      </div>
      <div className="flex gap-2">
        <Icons.edit className="mr-4 h-6 w-6 align-baseline text-brand" />
        <Icons.search className="h-6 w-6 text-brand" strokeWidth={1.75} />
      </div>
    </header>
  );
}

import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  Active: "bg-muted-green",
  "Follow-up": "bg-muted-yellow",
  Referred: "bg-muted-pink",
  Terminated: "bg-muted-sky",
};

const sampleScreenedStud = [
  { id: 1, name: "June Kasudi", status: ["Active"] },
  { id: 2, name: "Onyango Otieno", status: ["Follow-up"] },
  { id: 3, name: "Jonathan Smith", status: ["Terminated"] },
  { id: 4, name: "Vivian Hongo", status: ["Referred", "Active"] },
];

export default function ScreeningsPage() {
  return (
    <>
      <ClinicalFeatureCard />
      <div className="items-cente mt-5 flex justify-between">
        <h3 className="text-base font-semibold text-brand xl:text-2xl">
          Screened Students
        </h3>
        <button>
          <Icons.add className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        </button>
      </div>
      {/*  */}
      <div className="mt-4">
        <hr className="mt-4 border-b border-border/40" />
      </div>

      <div>
        {sampleScreenedStud.map((stud) => (
          <ScreenCard key={stud.id} {...stud} /> //destructure the object
        ))}
      </div>
    </>
  );
}

function ScreenCard({
  name = "",
  status = [],
}: {
  name: string;
  status: string[];
}) {
  return (
    <div className="mt-4 flex items-center  justify-between rounded-lg border-t-[0.1px] px-2 py-2 shadow-lg shadow-muted-sky ">
      <p className="text-base font-medium text-brand">{name}</p>
      <div className="flex items-center justify-between ">
        {status.map((stat, idx) => (
          <div
            key={idx}
            className={cn(
              "mx-2 flex h-7 w-7 items-center justify-center rounded-full",
              colors[stat],
            )}
          >
            <p className="text-base font-medium text-white ">
              {stat.charAt(0).toUpperCase()}
            </p>
          </div>
        ))}

        <Icons.referral className="mx-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
        <Icons.delete className="mx-2 h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
      </div>
    </div>
  );
}

import { ClinicalFeatureCard } from "#/app/(platform)/clinical-feature-card";
import { Icons } from "#/components/icons";
import { cn } from "#/lib/utils";

type Colors = {
  [key: string]: string
}

const colors: Colors = {
  "Active": "bg-muted-green",
  "Follow-up": "bg-muted-yellow",
  "Referred": "bg-muted-pink",
  "Terminated": "bg-muted-sky"
}



const sampleScreenedStud = [
  { id: 1, name: "June Kasudi", status: ["Active"] },
  { id: 2, name: "Onyango Otieno", status: ["Follow-up"] },
  { id: 3, name: "Jonathan Smith", status: ["Terminated"] },
  { id: 4, name: "Vivian Hongo", status: ["Referred", "Active"] },
]


export default function ScreeningsPage() {
  return (

    <>
      <ClinicalFeatureCard />
      <div className="flex justify-between items-cente mt-5">
        <h3 className="text-base font-semibold text-brand xl:text-2xl">
          Screened Students
        </h3>
        <button>
          <Icons.add className="h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand" />
        </button>
      </div>
      {/*  */}
      <div className="mt-4">
        <hr className="border-border/40 border-b mt-4" />
      </div>

      <div>
        {
          sampleScreenedStud.map((stud) => (
            <ScreenCard key={stud.id} {...stud} /> //destructure the object
          ))
        }
      </div>

    </>);
}

function ScreenCard({ name = "", status = [] }: { name: string, status: string[] }) {
  return (
    <div className="flex justify-between items-center  rounded-lg mt-4 px-2 py-2 shadow-muted-sky shadow-lg border-t-[0.1px] ">
      <p className="text-brand font-medium text-base" >{name}</p>
      <div className="flex justify-between items-center ">
        {
          status.map((stat) => (
            <div className={cn("mx-2 h-7 w-7 rounded-full items-center flex justify-center", colors[stat])}>
              <p className="text-white font-medium text-base ">
                {stat.charAt(0).toUpperCase()}
              </p>
            </div>
          ))
        }

        <Icons.referral className="h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand mx-2" />
        <Icons.delete className="h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand mx-2" />
      </div>
    </div>
  )
}
import { cn } from "#/lib/utils";

const ScreeningDetails = ({ params }: { params: { id: string } }) => {
  return <div>

    <h1>
      {params.id}
    </h1>
    <IntroHeader />
  </div>;
};

export default ScreeningDetails;


type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  active: "bg-muted-green",
  "follow-up": "bg-muted-yellow",
  referred: "bg-muted-pink",
  terminated: "bg-muted-sky",
};

const sampleReferredCasses = [
  { id: 1, status: "active" },
  { id: 2, status: "referred" },
  { id: 3, status: "follow-up" },
  { id: 4, status: "terminated" },

];



function IntroHeader() {
  return (
    <div className="flex flex-1 bg-yellow-400">
      <div className="flex rounded-full h-24 w-24 justify-center items-center bg-muted-green">
        <div className="rounded-full h-20 w-20 bg-muted-foreground" />
      </div>
      <div className="flex flex-col flex-1 ml-4">
        <div className="flex flex-col">
          <p className="text-2xl font-bold text-muted-foreground">Student Name</p>
          <p className="text-base font-medium text-muted-foreground">Shamiri ID</p>
        </div>
        <div className="flex bg-slate-600 flex-1 ">

          {
            sampleReferredCasses.map((stud) => (
              <div className={cn(
                "flex rounded-md h-5 w-8 justify-center items-center bg-muted-green ",
                colors[stud.status]
              )}>
                <p className="text-sm font-medium text-white ">
                  {stud.status.charAt(0).toUpperCase()}
                </p>
              </div>
            ))
          }
        </div>
      </div>

    </div>
  )
}
import { Icons } from "#/components/icons"
import { Button } from "#/components/ui/button"
import { Card } from "#/components/ui/card"
import { Separator } from "#/components/ui/separator"
import { cn } from "#/lib/utils"

export default function HomePage() {

  return (

    <SupervisorHomepage />


  )

}

function SupervisorHomepage() {
  return (
    <div>

      <Header />
      <OverviewCards />
      <Separator />

      <h3 className="font-semibold text-base text-brand mt-4">Recently opened</h3>
      <div className="mt-4">
        <SchoolsList />
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="mb-4">
      <div className="flex items-center">
        <h1 className="font-semibold text-[20px] text-brand pr-3">Hello, Netsanet</h1>
        <Icons.smileyface className="h-4 w-4 text-brand" />
      </div>
      <p className="text-muted-foreground">Have a nice day!</p>
    </header>

  )
}




function OverviewCards() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">

      <Card className="p-5 pr-3.5 flex flex-col gap-5 bg-brand pt-3.5 pl-3.5">
        <div className="flex justify-between">
          <div className="flex align-middle bg-green items-center">
            <Icons.users className="h-4 w-4 text-white mr-4 align-baseline" />
            <h3 className="font-semibold text-base text-brand text-white">Fellows</h3>
          </div>
          <p className="text-white text-5xl">09</p>
        </div>
      </Card>

      <Card className="p-5 pr-3.5 flex flex-col gap-5 bg-brand pt-3.5 pl-3.5">
        <div className="flex justify-between">
          <div className="flex align-middle bg-green items-center">
            <Icons.schoolMinusOutline className="h-4 w-4 text-white mr-4 align-baseline" />
            <h3 className="font-semibold text-base text-brand text-white">Schools</h3>
          </div>
          <p className="text-white text-5xl">04</p>
        </div>
      </Card>

      <Card className="p-5 pr-3.5 flex flex-col gap-5 bg-brand pt-3.5 pl-3.5 w-full">
        {/* todo: add title and card */}
        <div className="flex justify-between">
          <div className="h-24 w-24 rounded-full bg-black">
          </div>
          <div>
            <div className="flex justify-between  border-b border-border/50 pb-1">
              <p className="text-white text-sm font-medium">Active</p>
              <div className="bg-muted-green  bg-destructive px-3 rounded-md">
                <p className="text-white text-sm font-medium">03</p>
              </div>
            </div>
          </div>

        </div>

      </Card>

    </div>
  )
}

const schools = [{ name: "Maranda Sec School", population: 1400, sessions: ["Pre", "S1"], fellowsCount: 15 },
{ name: "Kanjeru Sec School", population: 23, sessions: ["Pre", "S1", "S2"], fellowsCount: 0 },
{ name: "Allaince Sec School", population: 100, sessions: ["Pre", "S1", "S3", "S4"], fellowsCount: 9 },
{ name: "Maseno Sec School", population: 400, sessions: ["Pre"], fellowsCount: 4 },
{ name: "Kamukunji Sec School", population: 900, sessions: ["Pre", "S1", "S2"], fellowsCount: 11 },
{ name: "Starehe Sec School", population: 1400, sessions: ["Pre"], fellowsCount: 7 },

]

function SchoolsList() {
  const sessionTypes = ["Pre", "S1", "S2", "S3", "S4"]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:grid-cols-3  sm:gap-6">
      {/* <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6"> */}
      {
        schools.map((school) => (
          <Card key={school.name} className="p-5 pr-3.5 flex flex-col gap-5">
            <div>
              <Icons.school className="h-10 text-brand" />
            </div>
            <div className="flex items-center gap-4 border-b border-border/50 pb-3">
              <h3 className="font-semibold text-base text-brand">{school.name}</h3>
              <Separator orientation={"vertical"} />
              <div className="flex flex-col gap-[1px]">
                <p className="font-semibold text-base text-brand">{school.population}</p>
                <p className="text-xs text-muted-foreground font-medium">Students</p>
              </div>

            </div>

            <div className="flex gap-2 justify-between">
              <div className="flex gap-3">
                {
                  sessionTypes.map((sessiontype) => (
                    <div key={sessiontype} className="flex flex-col items-center">
                      <p className="text-xs text-muted-foreground font-medium">{sessiontype}</p>
                      <div className={cn("h-4 w-4 rounded-full", {
                        "bg-green-600": school.sessions.includes(sessiontype),
                        "bg-gray-300": !school.sessions.includes(sessiontype)
                      })}></div>
                    </div>
                  ))
                }
              </div>
              <Button className="bg-shamiri-blue text-white flex gap-1 hover:bg-shamiri-blue-darker">
                <Icons.users className="h-4 w-4" />
                <p className="text-sm whitespace-nowrap">{school.fellowsCount} Fellows</p>
              </Button>
            </div>
          </Card>
        ))
      }
    </div>

  )
}








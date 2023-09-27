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
      <div className="mt-4">

        <SchoolsList />
      </div>
    </div>
  )
}

function Header() {
  return (
    <h1> Hello Header</h1>
  )
}
function OverviewCards() {
  return (
    <h1>Overview Cards</h1>
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
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
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








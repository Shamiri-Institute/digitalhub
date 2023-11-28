import { cn } from "#/lib/utils";
import { Separator } from "#/components/ui/separator";
import { Card } from "#/components/ui/card";
import { Button } from "#/components/ui/button";
import { AddClinicalSessionDialog } from "#/app/(platform)/screenings/[name]/components/add-clinical-session";


const sample_sessions_attended = [
    {
        name: "Nishan",
        session: "1",
        date: "20 Aug 2021",
    },
    {
        name: "Sweet",
        session: "4",
        date: "19 Jan 2021",
    },
    {
        name: "Orion",
        session: "3",
        date: "03 Aug 2021",
    },
    {
        name: "Esther",
        session: "2",
        date: "20 Feb 2021",
    },

]


export function Sessions() {
    return (
        <div className="flex flex-col">
            <Card
                className={cn("my-2  gap-5 p-4 pr-3.5bg-white")}
            >
                <div className="flex justify-between mb-2">
                    <p
                        className="text-base font-medium text-muted-foreground">
                        No.
                    </p>
                    <p
                        className="text-base font-medium text-muted-foreground">
                        Session Attended
                    </p>
                    <p
                        className="text-base font-medium text-muted-foreground">
                        Date
                    </p>
                </div>
                <Separator />
                {sample_sessions_attended.map((stud) => (
                    <SessionsCard key={stud.name}
                        name={stud.name}
                        session={stud.session}
                        date={stud.date} />
                ))}
            </Card>
            <div className="flex justify-end">
                <AddClinicalSessionDialog>
                    <Button variant="brand" className="w-fit">
                        Add
                    </Button>
                </AddClinicalSessionDialog>
            </div>
        </div >
    );
}

function SessionsCard({
    name, session, date
}: {
    name: string;
    session: string;
    date: string;
}
) {
    return (
        <div className="flex justify-between  mt-2 border-b items-center last:border-none" >
            <p
                className="text-sm text-brand flex-1 text-left ">
                {name}
            </p>
            <p
                className="text-sm text-brand flex-1  text-center">
                {session}
            </p>
            <p
                className="text-sm text-brand flex-1  text-right"
            >
                {date}
            </p>
        </div>
    )
}

"use client";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "#/components/ui/accordion";
import { Separator } from "#/components/ui/separator";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ChevronDownIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";
import { AddNoteDialog } from "#/app/(platform)/profile/school-report/[session]/add-note-dialogue";



export default function ReportDetails({ params }: { params: { session: string } }) {
    const { session } = params
    let sessionName = session.replace(/%20/g, " ")

    return <div>
        <Header session={sessionName} />
        <Rating />
        <ReportComponent />
        <Notes />
    </div>
}



const sessions = ["Pre session", "Session 01", "Session 02", "Session 03", "Session 04"]


function Header({ session }: { session: string }) {
    return (
        <div>
            <div className='flex justify-between  mt-2 '>
                <Link href='/profile/school-report'>
                    <button  >
                        <Icons.chevronLeft className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
                    </button>
                </Link>
                <div >
                    <h3 className='text-brand font-bold text-xl'>My School Report</h3>
                    <h4 className='text-xs text-center text-brand-light-gray'>Kamkunji Secondary School</h4>
                    <div className="justify-items-center pt-2 pl-8">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="ml-auto place-self-center whitespace-nowrap px-2 py-1.5 text-[0.8125rem] font-medium md:px-4 md:py-2 md:text-sm"
                                >
                                    {session}
                                    <ChevronDownIcon className="ml-1 h-4 w-4 md:ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {sessions.map((session) => {
                                    return (
                                        <DropdownMenuItem
                                            key={session}
                                            className="relative flex justify-between pr-10"
                                        // onSelect={() => {
                                        // //   setRoleFilter(role);
                                        //   table
                                        //     .getColumn("role")
                                        //     ?.setFilterValue(role === "All" ? "" : role);
                                        // }}
                                        >
                                            {session}

                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div>
                    {/* <button>
                        <Icons.xIcon className='h-6 w-6 align-baseline xl:h-7 xl:w-7 ' />
                    </button> */}
                </div>
            </div>


        </div >
    )
}


const FormSchema = z.object({
    positiveHighlight: z.string({
        required_error: "Please enter the positive highlights.",
    }),
    reportedChallenge: z.string({
        required_error: "Please enter the reported challenges.",
    }),
    recommendations: z.string({
        required_error: "Please enter the recommendations.",
    }),

});


function ReportComponent() {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            positiveHighlight: "",
            reportedChallenge: "",
            recommendations: "",
        },
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        // todo: submit the form (weekly report)
        toast({ title: "Report submitted successfully" });
    }

    return (
        <div className="px-6">
            <Form {...form}>
                <form
                    id="weeklyReportForm"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="overflow-hidden text-ellipsis px-1"
                >
                    <FormField
                        control={form.control}
                        name="positiveHighlight"
                        render={({ field }) => (
                            <div className="mt-3 grid w-full gap-1.5">
                                <Label htmlFor="emails">Positive Highlights</Label>
                                <Textarea
                                    id="positiveHighlight"
                                    name="positiveHighlight"
                                    onChange={field.onChange}
                                    defaultValue={field.value}
                                    placeholder="Write here..."
                                    className="mt-1.5 resize-none bg-card"
                                    rows={10}
                                />
                            </div>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reportedChallenge"
                        render={({ field }) => (
                            <div className="mt-6 grid w-full gap-1.5">
                                <Label htmlFor="emails">Reported Challenges</Label>
                                <Textarea
                                    id="reportedChallenge"
                                    name="reportedChallenge"
                                    onChange={field.onChange}
                                    defaultValue={field.value}
                                    placeholder="Write here..."
                                    className="mt-1.5 resize-none bg-card"
                                    rows={10}
                                />
                            </div>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="recommendations"
                        render={({ field }) => (
                            <div className="mt-6 grid w-full gap-1.5">
                                <Label htmlFor="emails">Recommendations</Label>
                                <Textarea
                                    id="recommendations"
                                    name="recommendations"
                                    onChange={field.onChange}
                                    defaultValue={field.value}
                                    placeholder="Write here..."
                                    className="mt-1.5 resize-none bg-card"
                                    rows={10}
                                />
                            </div>
                        )}
                    />
                </form>
            </Form>
        </div>
    )
}


function Rating() {
    return (
        <div className='px-6 mt-4'>
            <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                    <AccordionTrigger
                        className={
                            "items-right border-border/50 px-5 border bg-white"

                        }
                        iconClass={"h-7 w-7 mr-3 text-brand"}
                    >
                        <div
                            className='flex items-center'>
                            <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand mr-2' />
                            <span className="items-center align-middle"> Ratings</span>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent>
                        <div className="pt-4">
                            <div className='flex justify-between items-center '>
                                <p className='text-sm font-normal text-brand'>Student behavior</p>
                                <div className="flex flex-1  justify-end">
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                </div>
                            </div>

                            <div className='flex justify-between items-center mt-1'>
                                <p className='text-sm font-normal text-brand'>Admin support</p>
                                <div className="flex flex-1  justify-end">
                                    <div>
                                        <Icons.star className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-yellow' />
                                    </div>
                                    <Icons.star className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-yellow ml-4' />
                                    <Icons.star className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-yellow ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />

                                </div>
                            </div>

                            <div className='flex justify-between items-center mt-1'>
                                <p className='text-sm font-normal text-brand'>Workload</p>
                                <div className="flex flex-1  justify-end">
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                    <Icons.startOutline className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-muted-foreground ml-4' />
                                </div>
                            </div>

                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <Separator className="mt-4" />

        </div>
    )
}

function Notes() {
    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mt-4 pr-8 pl-2">
                <h3
                    className="text-sm font-semibold text-muted-foreground mt-4 ml-6"
                >
                    Added Notes
                </h3>


            </div>
            <div className="flex my-4 pr-8 pl-2">
                <div>
                    <h3
                        className="text-sm font-semibold text-muted-foreground mt-4 ml-6"
                    >
                        Supervisor Name
                    </h3>
                </div>

                <div>
                    <p
                        className="text-sm font-normal text-brand mt-4 ml-6"
                    >Lorem ipsum dolor sit amet consectetur adipisicing elit. Eveniet veniam autem pariatur? Placeat dolorem laborum, facilis error distinctio ea in optio libero quidem dicta voluptates quia, consequuntur sed saepe blanditiis?</p>
                    <div
                        className="flex  justify-center items-center mt-5"
                    >
                        <p className="text-xs font-normal text-brand-light-gray">
                            March 20
                        </p>
                        <div className="w-0.5 h-6 bg-border/50 mx-2 " />
                        <p className="text-xs font-normal text-brand-light-gray ">
                            4:18pm
                        </p>
                    </div>

                    <AddNoteDialog >

                        <Button type="submit" className="w-full mt-4 bg-shamiri-blue hover:bg-brand">Add Note</Button>

                    </AddNoteDialog>
                </div>


            </div>

        </div>
    )
}
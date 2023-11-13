"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { FormField } from "#/components/ui/form";
import { Popover, PopoverContent } from "#/components/ui/popover";
import { cn } from "#/lib/utils";
import { Card } from "#/components/ui/card";
import Link from "next/link";

const FormSchema = z.object({
    dateOfSession: z.date({
        required_error: "Please enter the fellow's date of session.",
    }),

});


let sessions = [{
    session: "Pre session",
    done: true
}, { session: "Session 01", done: false },
{ session: "Session 02", done: false },
{ session: "Session 03", done: false },
{ session: "Session 04", done: false },
{ session: "Follow-up 01", done: false },
{ session: "Follow-up 02", done: false },
{ session: "Follow-up 03", done: false },
{ session: "Follow-up 04", done: false },
{ session: "Follow-up 05", done: false },
{ session: "Follow-up 06", done: false },
{ session: "Follow-up 07", done: false },
{ session: "Follow-up 08", done: false },



]



export default function SchoolReport() {
    return (
        <div >
            <IntroHeader />
            {sessions.map
                (session => (
                    <SchoolReportCard name={session.session} done={session.done} />
                ))}

        </div>
    )
}

export function IntroHeader() {
    return (
        <>
            <div className='flex justify-between items-center mt-2 '>
                <Link href='/profile'>
                    <button  >
                        <Icons.chevronLeft className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
                    </button>
                </Link>
                <h3 className='text-brand font-bold text-xl'>My School Report</h3>
                {/* <button>
                    <Icons.add className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-shamiri-blue' />
                </button> */}
                <div>
                </div>
            </div>
            <h4 className='text-xs text-center text-brand-light-gray'>Kamkunji Secondary School</h4>

        </>
    )
}

function SchoolReportCard({
    name,
    done
}: {
    name: string;
    done: boolean;
}) {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });
    return (
        <Card className="my-4 flex">
            <div className='flex  items-center mt-2 py-2 px-4  '>
                <div className="flex items-start h-full">
                    <div className={cn('h-6 w-6 bg-gray-400 rounded-full',

                        done ? 'bg-muted-green' : 'bg-gray-400'
                    )} />
                </div>
                <div className='flex flex-col justify-start'>
                    <Link href={`/profile/school-report/${name}`}>

                        <p className='text-base font-semibold text-brand pl-3'>
                            {name}
                        </p>
                    </Link>

                    <div className='flex justify-start items-baseline'>
                        {/* <p className='text-xs font-semibold text-brand pl-3'>

                            Monday, Jan 4th
                        </p> */}
                        <FormField
                            control={form.control}
                            name="dateOfSession"
                            render={({ field }) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={null}
                                            className={cn(
                                                "text-xs font-normal text-brand pl-3 my-0 py-0",
                                                !field.value && "text-xs font-normal text-brand pl-3 ",
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Monday, Jan 4th</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                        <div className='border-l border-border/50 pl-3 mx-4' />
                        <p className='text-xs font-normal text-brand'>
                            10:00am - 11:00am
                        </p>
                    </div>
                </div>
            </div>
        </Card >
    )
}
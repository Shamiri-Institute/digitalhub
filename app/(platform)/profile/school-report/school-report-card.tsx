"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopoverTrigger } from "@radix-ui/react-popover";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Card } from "#/components/ui/card";
import { FormField } from "#/components/ui/form";
import { Popover, PopoverContent } from "#/components/ui/popover";
import { cn } from "#/lib/utils";
import Link from "next/link";
import { FormSchema } from "./page";

export function SchoolReportCard({ name, attended }: { name: string; attended: boolean; }) {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });
    return (
        <Card className="my-4 flex">
            <div className="mt-2  flex items-center px-4 py-2  ">
                <div className="flex h-full items-start">
                    <div
                        className={cn(
                            "h-6 w-6 rounded-full bg-gray-400",

                            attended ? "bg-muted-green" : "bg-gray-400"
                        )} />
                </div>
                <div className="flex flex-col justify-start">
                    <Link href={`/profile/school-report/${name}`}>
                        <p className="pl-3 text-base font-semibold text-brand">{name}</p>
                    </Link>

                    <div className="flex items-baseline justify-start">
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
                                                "my-0 py-0 pl-3 text-xs font-normal text-brand",
                                                !field.value && "pl-3 text-xs font-normal text-brand "
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
                                            initialFocus />
                                    </PopoverContent>
                                </Popover>
                            )} />
                        <div className="mx-4 border-l border-border/50 pl-3" />
                        <p className="text-xs font-normal text-brand">10:00am - 11:00am</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}

"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { School } from "@prisma/client";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";
import { SchoolDropoutDialog } from "#/app/(platform)/profile/myschool/school-dropout-dialog";

export const FormSchema = z.object({
    schoolName: z.string({
        required_error: "Please enter the promise number of students.",
    }),
    promisedNoOfStudents: z.string({
        required_error: "Please enter the promise number of students.",
    }),
    pointPersonName: z.string({
        required_error: "Please enter the point person's name.",
    }),
    pointPersonEmail: z.string({
        required_error: "Please enter the point person's email.",
    }),
    pointPersonCounty: z.string({
        required_error: "Please enter the point person's county.",
    }),
    schoolEmail: z.string({
        required_error: "Please enter the school's email.",
    }),
    schoolContact: z.string({
        required_error: "Please enter the school's contact number.",
    }),
    schoolType: z.string({
        required_error: "Please select the school type.",
    })
});



export function MySchool({ school }: { school: School | null }) {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });

    const router = useRouter();

    return (
        <div className='flex flex-col'>
            <div className='flex justify-between items-center mb-5 mt-2'>
                <button className='flex flex-1' onClick={() => router.back()}>
                    <Icons.chevronLeft className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
                </button>
                {/* <button>
                <Icons.add className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
            </button> */}
            </div>
            <h3 className='text-base font-semibold text-brand xl:text-2xl mb-2'>
                My Fellows
            </h3>
            <Card
                className="mb-4 flex flex-col gap-5 p-5 pr-3.5 bg-brand py-8"
            >
                <p className='text-gray-400'>Info</p>

                <h3 className="font-bold xl:text-xl text-shamiri-light-blue">
                    {school?.schoolName}
                </h3>
                <div className=" space-y-6">

                    <div className="mt-6 space-y-6">
                        <div>
                            <FormField
                                control={form.control}
                                name="promisedNoOfStudents"
                                render={({ field }) => (
                                    <div className="mt-3 grid w-full gap-1.5">
                                        <Input
                                            id="promisedNoOfStudents"
                                            name="promisedNoOfStudents"
                                            onChange={field.onChange}
                                            type="number"
                                            // defaultValue={fellow.s || field.value}
                                            className="mt-1.5 resize-none bg-card"
                                            placeholder="Promised number of students"
                                            data-1p-ignore="true" />
                                    </div>
                                )} />
                        </div>
                        <div>
                            <h3 className='my-6 text-gray-400'>Point Person</h3>
                            <FormField
                                control={form.control}
                                name="pointPersonName"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="pointPersonName"
                                            name="pointPersonName"
                                            onChange={field.onChange}
                                            type="text"
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="Name"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="pointPersonEmail"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="pointPersonEmail"
                                                name="pointPersonEmail"
                                                type="pointPersonEmail"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Email"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="pointPersonCounty"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="pointPersonCounty"
                                                name="pointPersonCounty"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="County"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                        </div>
                        <div>
                            <h3 className='my-6  text-gray-400'>School</h3>
                            <FormField
                                control={form.control}
                                name="schoolEmail"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="schoolEmail"
                                            name="schoolEmail"
                                            type="email"
                                            onChange={field.onChange}
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="Email"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="schoolContact"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="schoolContact"
                                                name="schoolContact"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Contact number"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                        </div>

                    </div>

                    <div>
                        <h3 className='my-6 text-gray-400'>School Type</h3>
                        <div className='grid grid-cols-3 gap-x-2 mt-2 gap-y-2'>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Girls
                            </Button>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Boys
                            </Button>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Both
                            </Button>

                        </div>
                        <div className='grid grid-cols-3 gap-x-2 gap-y-2'>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Day
                            </Button>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Boarding
                            </Button>
                            <Button
                                type="submit"
                                className="w-full bg-white mb-2 py-5 text-gray-600 transition-transform hover:bg-shamiri-blue-darker active:scale-95"
                            >
                                Both
                            </Button>

                        </div>


                        <Button
                            type="submit"
                            className="mt-8 w-full bg-shamiri-blue py-5 text-white transition-transform hover:bg-shamiri-blue-darker hover:text-white active:scale-95"
                        >
                            Save
                        </Button>
                        {/* <Button
                type="submit"
                className="mt-2 w-full bg-shamiri-red
                 py-5 text-white transition-transform hover:bg-shamiri-red hover:text-white active:scale-95"
            >
                Remove
            </Button> */}
                        {school && <SchoolDropoutDialog school={school}>
                            <Button
                                type="submit"
                                className="mt-2 w-full bg-shamiri-red
                             py-5 text-white transition-transform hover:bg-shamiri-red hover:text-white active:scale-95"
                            >

                                Remove
                            </Button>
                        </SchoolDropoutDialog>}



                    </div>
                </div>


            </Card>


        </div>
    );
}

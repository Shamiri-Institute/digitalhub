"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Card } from "#/components/ui/card";

const FormSchema = z.object({
    personalEmail: z.string({
        required_error: "Please enter the promise number of students.",
    }),
    contactNumber: z.string({
        required_error: "Please enter the promise number of students.",
    }),
    nationalId: z.string({
        required_error: "Please enter the point person's name.",
    }),
    dateOfBirth: z.string({
        required_error: "Please enter the point person's email.",
    }),
    gender: z.string({
        required_error: "Please enter the point person's county.",
    }),
    mpesaNumber: z.string({
        required_error: "Please enter the school's email.",
    }),
    mpesaName: z.string({
        required_error: "Please enter the school's email.",
    }),
    bankName: z.string({
        required_error: "Please enter the school's contact number.",
    }),
    bankBranch: z.string({
        required_error: "Please enter the school's contact number.",
    }),
    bankAccount: z.string({
        required_error: "Please enter the school's contact number.",
    }),
    bankAccountHolder: z.string({
        required_error: "Please enter the school's contact number.",
    }),
    nssf: z.string({
        required_error: "Please select the school type.",
    }),
    nhif: z.string({
        required_error: "Please select the school type.",
    }),
    kra: z.string({
        required_error: "Please select the school type.",
    }),
    county: z.string({
        required_error: "Please select the school type.",
    }),
    subCounty: z.string({
        required_error: "Please select the school type.",
    }),
});


export default function EditBio() {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });

    const router = useRouter();

    return (
        <div className='flex flex-col'>
            <div className='flex  items-center mb-5 mt-2 justify-end'>
                <button onClick={() => router.back()}>
                    <Icons.xIcon className='h-6 w-6 align-baseline xl:h-7 xl:w-7 text-brand' />
                </button>
            </div>

            <Card
                className="mb-4 flex flex-col gap-5 p-5 pr-3.5 bg-brand py-8"
            >

                <h3 className='text-base font-semibold text-muted-foreground'>
                    My Info
                </h3>
                <h3 className='text-base font-semibold text-shamiri-light-blue '>
                    Supervisor Name
                </h3>
                <div className=" space-y-6">

                    <div className="mt-6 space-y-6">
                        <div>
                            <FormField
                                control={form.control}
                                name="personalEmail"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="personalEmail"
                                            name="personalEmail"
                                            onChange={field.onChange}
                                            type="email"
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="Personal email address"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="contactNumber"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="contactNumber"
                                                name="contactNumber"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Contact number"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="nationalId"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="nationalId"
                                                name="nationalId"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="National ID"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="dateOfBirth"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="dateOfBirth"
                                                name="dateOfBirth"
                                                type="date"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="MM/DD/YYYY"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                        </div>

                        <div>
                            <h3 className='mb-4 text-gray-400'>Gender</h3>
                            <div className='grid grid-cols-3 gap-x-2 gap-y-2'>
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
                        </div>
                        <div>
                            <h3 className='mb-4  text-gray-400'>Mpesa</h3>
                            <FormField
                                control={form.control}
                                name="mpesaName"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="mpesaName"
                                            name="mpesaName"
                                            type="text"
                                            onChange={field.onChange}
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="Mpesa Name"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="mpesaNumber"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="mpesaNumber"
                                                name="mpesaNumber"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Mpesa Number"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                        </div>
                        <div>
                            <h3 className='mb-4  text-gray-400'>Bank</h3>
                            <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="bankName"
                                            name="bankName"
                                            type="text"
                                            onChange={field.onChange}
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="Bank Name"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="bankBranch"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="bankBranch"
                                                name="bankBranch"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Branch Branch"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="bankAccount"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="bankAccount"
                                                name="bankAccount"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Branch Account"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="bankAccountHolder"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="bankAccountHolder"
                                                name="bankAccountHolder"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Branch Account Holder"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>

                        </div>
                        <div>
                            <h3 className='mb-4  text-gray-400'>Statutory</h3>
                            <FormField
                                control={form.control}
                                name="nssf"
                                render={({ field }) => (
                                    <div className="mt-2 grid w-full gap-1.5">
                                        <Input
                                            id="nssf"
                                            name="nssf"
                                            type="text"
                                            onChange={field.onChange}
                                            // defaultValue={fellow?.mpesaName || field.value}
                                            placeholder="NSSF"
                                            className="resize-none bg-card" />
                                    </div>
                                )} />
                            <div>
                                <FormField
                                    control={form.control}
                                    name="nhif"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="nhif"
                                                name="nhif"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="NHIF"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="kra"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="kra"
                                                name="kra"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="KRA"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="county"
                                    render={({ field }) => (
                                        <div className="mt-8 grid w-full gap-1.5">
                                            <Input
                                                id="county"
                                                name="county"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="County"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>
                            <div>
                                <FormField
                                    control={form.control}
                                    name="subCounty"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="subCounty"
                                                name="subCounty"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Sub County"
                                                className="resize-none bg-card" />
                                        </div>
                                    )} />
                            </div>

                        </div>
                    </div>

                    <Button className="w-full mt-4 bg-shamiri-blue hover:bg-shamiri-blue" >
                        Save
                    </Button>
                </div>


            </Card >


        </div >
    )
}

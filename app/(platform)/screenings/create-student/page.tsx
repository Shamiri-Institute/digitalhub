"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Form, FormField } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { useState } from "react";
import { cn } from "#/lib/utils";

const FormSchema = z.object({
    name: z.string({
        required_error: "Please enter the student name.",
    }),
    shamiriID: z.string({
        required_error: "Please shamiri ID.",
    }),
    age: z.number({
        required_error: "Please enter the student's age.",
    }),
    admission: z.number({
        required_error: "Please enter the student's admission number.",
    }),
    gender: z.string({
        required_error: "Please enter the student's gender.",
    }),
    stream: z.string({
        required_error: "Please enter the student's stream.",
    }),
    contactNumber: z.string({
        required_error: "Please enter the student's contact number.",
    }),

});

export default function CreateStudent() {
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });
    const [gender, setGender] = useState("")
    const [studentClass, setStudentClass] = useState("")


    const formAction = () => {
        // todo: make api call
        alert("kk")
    }

    const router = useRouter();

    return (
        <div className="flex flex-col ">
            <div className="mb-5  mt-2 flex items-center justify-end">
                <button onClick={() => router.back()}>
                    <Icons.xIcon className="h-6 w-6 align-baseline text-brand xl:h-7 xl:w-7" />
                </button>
            </div>

            <h3 className="text-base font-semibold text-brand">
                Student Information
            </h3>
            <div className=" space-y-6 ">
                <Form {...form}>
                    <form
                        // onSubmit={form.handleSubmit(onSubmit)}
                        action={formAction}
                        className="overflow-hidden text-ellipsis"
                    >
                        <div className="mt-6 space-y-6 px-[0.9px]">
                            <div>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="name"
                                                name="name"
                                                onChange={field.onChange}
                                                type="text"
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Student name"
                                                className="resize-none bg-card"
                                            />
                                        </div>
                                    )}
                                />
                                <div>
                                    <FormField
                                        control={form.control}
                                        name="shamiriID"
                                        render={({ field }) => (
                                            <div className="mt-2 grid w-full gap-1.5">
                                                <Input
                                                    id="shamiriID"
                                                    name="shamiriID"
                                                    type="text"
                                                    onChange={field.onChange}
                                                    // defaultValue={fellow?.mpesaName || field.value}
                                                    placeholder="Shamiri ID"
                                                    className="resize-none bg-card"
                                                />
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="mt-8">
                                    <FormField
                                        control={form.control}
                                        name="age"
                                        render={({ field }) => (
                                            <div className="mt-2 grid w-full gap-1.5">
                                                <Input
                                                    id="age"
                                                    name="age"
                                                    type="number"
                                                    onChange={field.onChange}
                                                    // defaultValue={fellow?.mpesaName || field.value}
                                                    placeholder="Age: eg 12"
                                                    className="resize-none bg-card"
                                                />
                                            </div>
                                        )}
                                    />
                                </div>

                                <div>
                                    <FormField
                                        control={form.control}
                                        name="admission"
                                        render={({ field }) => (
                                            <div className="mt-2 grid w-full gap-1.5">
                                                <Input
                                                    id="admission"
                                                    name="admission"
                                                    type="number"
                                                    onChange={field.onChange}
                                                    // defaultValue={fellow?.mpesaName || field.value}
                                                    placeholder="Admission number"
                                                    className="resize-none bg-card"
                                                />
                                            </div>
                                        )}
                                    />
                                </div>
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
                                                    className="resize-none bg-card"
                                                />
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-4 text-gray-400">Class/Form</h3>
                                <div className="grid grid-cols-4 gap-x-2 gap-y-2">
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            studentClass === "1" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setStudentClass("1")
                                        }}
                                    >
                                        1
                                    </Button>
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            studentClass === "2" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setStudentClass("2")
                                        }}
                                    >
                                        2
                                    </Button>
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            studentClass === "3" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setStudentClass("3")
                                        }}
                                    >
                                        3
                                    </Button>
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            studentClass === "4" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setStudentClass("4")
                                        }}
                                    >
                                        4
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <FormField
                                    control={form.control}
                                    name="stream"
                                    render={({ field }) => (
                                        <div className="mt-2 grid w-full gap-1.5">
                                            <Input
                                                id="stream"
                                                name="stream"
                                                type="text"
                                                onChange={field.onChange}
                                                // defaultValue={fellow?.mpesaName || field.value}
                                                placeholder="Add stream here"
                                                className="resize-none bg-card"
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                            <div>
                                <h3 className="mb-4  text-gray-400">Gender</h3>
                                <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            gender === "Male" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setGender("Male")
                                        }}
                                    >
                                        Male
                                    </Button>
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            gender === "Female" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setGender("Female")
                                        }}
                                    >
                                        Female
                                    </Button>
                                    <Button
                                        className={cn("mb-2 w-full bg-white py-5 text-gray-600 transition-transform active:scale-95 hover:bg-transparent",
                                            gender === "Other" && "bg-shamiri-light-blue hover:bg-shamiri-light-blue"
                                        )} onClick={(e) => {
                                            e.preventDefault()
                                            setGender("Other")
                                        }}
                                    >
                                        Other
                                    </Button>

                                </div>

                            </div>
                        </div>

                        <Button className="mt-4 w-full bg-shamiri-blue hover:bg-shamiri-blue">
                            Save
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { dropoutStudentWithReason } from "#/app/actions";
import { Button } from "#/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTrigger,
} from "#/components/ui/dialog";
import { Form, FormField } from "#/components/ui/form";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";

import { cn } from "#/lib/utils";


const FormSchema = z.object({
    reason: z.string({
        required_error: "Please enter the drop out reason",
    }),
});


const initialDropoutState = {
    reason: "Lack of commitment",
    dropoutReason: "",
}



const dropOutReducer = (state, action) => {
    if (action.type === "Lack of commitment") {
        return {
            ...state,
            reason: "Lack of commitment",
        }
    }
    if (action.type === "Timeline conflict") {
        return {
            ...state,
            reason: "Timeline conflict",
        }
    }
    if (action.type === "Poor communication") {
        return {
            ...state,
            reason: "Poor communication",
        }
    }
    if (action.type === "Don't fully understand the program") {
        return {
            ...state,
            reason: "Don't fully understand the program",
        }
    }
    if (action.type === "Other") {
        return {
            ...state,
            reason: "Other",
        }
    }
    // if(action.type === "dropoutReason") {
    //     return {
    //         ...state,
    //         dropoutReason: action.payload,
    //     }
    // }
    return state
}

export function SchoolDropoutDialog({
    school,
    children,
}: {
    school: any; // todo: add school type
    children: React.ReactNode;
}) {

    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dropOutState, dispatch] = React.useReducer(dropOutReducer, initialDropoutState)

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        // const response = await dropoutStudentWithReason(
        //   student.visibleId,
        //   student.school.visibleId,
        //   student.fellow.visibleId,
        //   data.reason,
        // );
        // if (response?.error) {
        //   toast({
        //     variant: "destructive",
        //     title: response?.error,
        //   });
        //   return;
        // }

        // if (response) {
        //   toast({
        //     title: `Dropped out ${student.studentName}`,
        //   });

        //   setDialogOpen(false);

        //   form.reset();
        // } else {
        toast({
            variant: "destructive",
            title: "Something went wrong",
        });
        // }
    }

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="gap-0 p-0">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="overflow-hidden text-ellipsis"
                    >
                        <DialogHeader className="space-y-0 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <span className="text-base font-medium">
                                    School Dropped out?
                                    {/* Drop out {school.name} */}
                                </span>
                            </div>
                        </DialogHeader>
                        <Separator />

                        <div className="my-6 space-y-6">
                            <div className="px-6 flex flex-col">
                                {/* clickable options such as lack of 'timeline conflict', 'lack of commitment' with a grayish background */}
                                <h3 className="text-lg font-bold text-brand mb-2">Tell us why</h3>


                                <Button
                                    className={cn("w-full my-1 bg-muted", {
                                        "bg-muted-foreground hover:bg-muted-foreground": dropOutState.reason === "Lack of commitment",
                                    })}
                                    variant="outline"
                                    onClick={() => dispatch({ type: "Lack of commitment" })}
                                >
                                    Lack of commitment
                                </Button>
                                <Button
                                    className={cn("w-full my-1 bg-muted hover:bg-muted", {
                                        "bg-muted-foreground hover:bg-muted-foreground": dropOutState.reason === "Timeline conflict",
                                    })}
                                    variant="outline"
                                    onClick={() => dispatch({ type: "Timeline conflict" })}
                                >
                                    Timeline conflict
                                </Button>
                                <Button
                                    className={cn("w-full my-1 bg-muted ", {
                                        "bg-muted-foreground hover:bg-muted-foreground": dropOutState.reason === "Poor communication",
                                    })}
                                    variant="outline"
                                    onClick={() => dispatch({ type: "Poor communication" })}
                                >
                                    Poor communication
                                </Button>
                                <Button
                                    className={cn("w-full my-1 bg-muted ", {
                                        "bg-muted-foreground hover:bg-muted-foreground": dropOutState.reason === "Don't fully understand the program",
                                    })}
                                    variant="outline"
                                    onClick={() => dispatch({ type: "Don't fully understand the program" })}
                                >
                                    Don't fully understand the program
                                </Button>

                            </div>
                        </div>


                        <div className="my-6 space-y-6">
                            <div className="px-6">
                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <div className="mt-3 grid w-full gap-1.5">
                                            <Label htmlFor="emails">Tell us why</Label>


                                            <Textarea
                                                id="reason"
                                                name="reason"
                                                onChange={field.onChange}
                                                defaultValue={field.value}
                                                placeholder="Tell us why, write here..."
                                                className="mt-1.5 resize-none bg-card"
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end px-6 pb-6">
                            <Button variant="destructive" type="submit" className="w-full">
                                Drop out {school.name}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Button } from "components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
} from "components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "components/ui/form";
import { Input } from "components/ui/input";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "components/ui/toast";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const profileSchema = z.object({
  supervisorEmail: z.string().email({ message: "Invalid email address" }),
  supervisorName: z.string().min(1, { message: "Supervisor Name is required" }),
  idNumber: z.string().min(1, { message: "ID Number is required" }),
  cellNumber: z.string().min(1, { message: "Phone Number is required" }),
  mpesaNumber: z.string().min(1, { message: "M-Pesa Number is required" }),
  dateOfBirth: z.string().min(1, { message: "Date of Birth is required" }),
  gender: z.enum(["Male", "Female"], {
    errorMap: () => ({ message: "Gender is required" }),
  }),
  county: z.string().min(1, { message: "County is required" }),
  subCounty: z.string().min(1, { message: "Sub-County is required" }),
  bankName: z.string().min(1, { message: "Bank Name is required" }),
  bankBranch: z.string().min(1, { message: "Bank Branch is required" }),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

type MyProfileDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export default function MyProfileDialog({
  isOpen,
  setIsOpen,
}: MyProfileDialogProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const defaultProfile: ProfileFormData = {
    supervisorEmail: "",
    supervisorName: "",
    idNumber: "",
    cellNumber: "",
    mpesaNumber: "",
    dateOfBirth: "",
    gender: "Male",
    county: "",
    subCounty: "",
    bankName: "",
    bankBranch: "",
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultProfile,
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      (async () => {
        try {
          const res = await fetch("/api/get-profile");
          if (!res.ok) {
            throw new Error("Failed to fetch profile");
          }
          const data = await res.json();
          form.reset({
            supervisorEmail: data.supervisorEmail || "",
            supervisorName: data.supervisorName || "",
            idNumber: data.idNumber || "",
            cellNumber: data.cellNumber || "",
            mpesaNumber: data.mpesaNumber || "",
            dateOfBirth: data.dateOfBirth
              ? new Date(data.dateOfBirth).toISOString().split("T")[0]
              : "",
            gender: data.gender || "Male",
            county: data.county || "",
            subCounty: data.subCounty || "",
            bankName: data.bankName || "",
            bankBranch: data.bankBranch || "",
          });
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen, form]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setUpdating(true);
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dateOfBirth: new Date(data.dateOfBirth),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to update profile");

      setToasts((prev) => [
        ...prev,
        {
          title: "Success",
          description: "Profile updated successfully!",
          variant: "success",
        },
      ]);
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setToasts((prev) => [
        ...prev,
        {
          title: "Error",
          description: "An error occurred while updating your profile.",
          variant: "destructive",
        },
      ]);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ToastProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogContent className="w-full max-w-lg space-y-1 p-4">
            {loading || updating ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-t-4 border-solid border-blue-500" />
              </div>
            ) : (
              <>
                <DialogHeader>
                  <h2 className="mb- text-xl font-bold">My Profile</h2>
                  <div className="font-figtree flex items-center gap-4">
                    <div className="relative h-7 w-7">
                      <img
                        src={session?.user?.image || "/placeholder.png"}
                        alt="Profile"
                        className="h-32px w-32px border-gray-10 rounded-full border object-cover"
                      />
                    </div>

                    <p
                      className="font-figtree text-left text-[20px] font-semibold leading-[28px] text-gray-600"
                      style={{
                        textUnderlinePosition: "from-font",
                        textDecorationSkipInk: "none",
                      }}
                    >
                      {form.getValues("supervisorName") || "N/A"}
                    </p>
                  </div>
                </DialogHeader>

                <div className="space-y-2">
                  <hr className="border-t border-gray-300" />
                  <h2 className="text-[10px] font-semibold text-gray-400">
                    PROFILE INFORMATION
                  </h2>
                  <hr className="border-t border-gray-300" />
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        name="supervisorEmail"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="cellNumber"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Phone Number{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        name="idNumber"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              ID Number <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="gender"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Gender <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-xs">
                                  <span>{field.value || "Select Gender"}</span>
                                  <ChevronDownIcon className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Male")}
                                  >
                                    Male
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Female")}
                                  >
                                    Female
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      name="dateOfBirth"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">
                            Date of Birth{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              className="w-full bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        name="county"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              County <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="subCounty"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Sub-County <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* MPESA Section */}
                    <div className="space-y-1">
                      <h2 className="text-[10px] font-semibold text-gray-400">
                        MPESA INFORMATION
                      </h2>
                      <hr className="border-t border-gray-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        name="supervisorName"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Full Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="mpesaNumber"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              M-Pesa Number{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                style={{ backgroundColor: "white" }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-[10px] font-semibold text-gray-400">
                        BANK DETAILS
                      </h2>
                      <hr className="border-t border-gray-300" />
                    </div>

                    {/* Bank Name and Bank Branch */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        name="bankName"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Bank Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-xs">
                                  <span>{field.value || "Select Bank"}</span>
                                  <ChevronDownIcon className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Bank A")}
                                  >
                                    Bank 1
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Bank B")}
                                  >
                                    Bank 2
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        name="bankBranch"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">
                              Bank Branch{" "}
                              <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <DropdownMenu>
                                <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white p-2 text-xs">
                                  <span>{field.value || "Select Branch"}</span>
                                  <ChevronDownIcon className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Branch 1")}
                                  >
                                    Branch 1
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => field.onChange("Branch 2")}
                                  >
                                    Branch 2
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <hr className="my-5 border-t border-gray-300" />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 px-6 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Update & Save
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
      <ToastViewport className="fixed bottom-4 right-4 z-[100] w-96 " />
      {toasts.map((toast, index) => (
        <Toast key={index} variant={toast.variant}>
          <ToastTitle>{toast.title}</ToastTitle>
          <ToastDescription>{toast.description}</ToastDescription>
        </Toast>
      ))}
    </ToastProvider>
  );
}

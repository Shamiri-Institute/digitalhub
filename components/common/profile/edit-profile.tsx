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
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const profileSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  phoneNumber: z.string().min(1, { message: "Phone number is required" }),
  nationalId: z.string().min(1, { message: "National ID is required" }),
  gender: z.enum(["Male", "Female"], {
    errorMap: () => ({ message: "Gender is required" }),
  }),
  dob: z.string().min(1, { message: "Date of Birth is required" }),
  county: z.string().min(1, { message: "County is required" }),
  subCounty: z.string().min(1, { message: "Sub-County is required" }),
  fullName: z.string().min(1, { message: "Full Name is required" }),
  mPesaNumber: z.string().min(1, { message: "M-Pesa number is required" }),
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

  const defaultProfile: ProfileFormData = {
    email: session?.user?.email || "",
    phoneNumber: "",
    nationalId: "",
    gender: "Male",
    dob: "",
    county: "",
    subCounty: "",
    fullName: session?.user?.name || "",
    mPesaNumber: "",
    bankName: "",
    bankBranch: "",
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultProfile,
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to update profile");
      alert("Profile updated successfully!");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error in form submission:", error);
      alert("An error occurred while updating your profile.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogPortal>
        <DialogContent className="w-full max-w-lg space-y-4 p-8">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                <img
                  src={session?.user?.image || "/placeholder.png"}
                  alt="Profile"
                  className="h-16 w-16 object-cover"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold">My Profile</h2>
                <p className="text-xs text-gray-700">
                  {defaultProfile.fullName || "N/A"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email and Phone Number */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        Email address
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
                  name="phoneNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        Phone number <span className="text-red-500">*</span>
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

              {/* National ID and Gender */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  name="nationalId"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        National ID <span className="text-red-500">*</span>
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

              {/* Date of Birth */}
              <FormField
                name="dob"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Date of Birth <span className="text-red-500">*</span>
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

              {/* County and Sub-County */}
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
              <div className="space-y-2">
                <h2 className="text-[10px] font-semibold text-gray-400">
                  MPESA
                </h2>
                <hr className="border-t border-gray-300" />
              </div>

              {/* Full Name and M-Pesa Number */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  name="fullName"
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
                  name="mPesaNumber"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        M-Pesa Number <span className="text-red-500">*</span>
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

              {/* BANK INFORMATION Section */}
              <div className="space-y-2">
                <h2 className="text-[10px] font-semibold text-gray-400">
                  BANK INFORMATION
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
                              Bank A
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => field.onChange("Bank B")}
                            >
                              Bank B
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
                        Bank Branch <span className="text-red-500">*</span>
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
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

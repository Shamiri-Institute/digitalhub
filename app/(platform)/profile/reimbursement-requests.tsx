"use client"
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

export function ReimbursementRequests({ requests }: { requests: Prisma.ReimbursementRequestGetPayload<{}>[]; }) {
    const [showMore, setShowMore] = useState(false);

    let rows = requests;
    if (!showMore) {
        rows = rows.slice(0, 3);
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:items-center  sm:gap-6">
                <h3 className="mt-4 text-lg font-semibold text-brand">Expenses</h3>
                <Card className={cn("mb-4 flex flex-col gap-5 bg-white p-5 pr-3.5 ")}>
                    <div className="flex flex-col">
                        <div className="">
                            <h3 className="text-sm font-normal text-muted-foreground">
                                Previous Requests History
                            </h3>
                            <Separator className="w-full" />

                            {rows.map((request) => (
                                <TransportReimbursementRequestCard
                                    key={request.id}
                                    request={request} />
                            ))}
                        </div>

                        <button className="mt-4 w-full text-xs text-shamiri-blue" onClick={() => setShowMore((showMore) => !showMore)}>
                            {showMore ? 'Show Less' : 'Show More'}
                        </button>

                        <Link href={`/profile/refund`}>
                            <Button className="mt-4 w-full bg-shamiri-blue hover:bg-brand">
                                Request Refund
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        </>
    );
}



export function TransportReimbursementRequestCard({
    request,
}: {
    request: Prisma.ReimbursementRequestGetPayload<{}>;
}) {
    return (
        <div className="my-2 flex items-center">
            <div className="mr-2 h-2 w-2 rounded-full bg-brand" />
            <div className="mr-4 flex flex-1 flex-col ">
                <div className="flex justify-between">
                    <div className="flex gap-1.5">
                        <p className="text-base font-normal text-brand uppercase">{(request.details as any)['subtype']}</p>
                        <span className={cn("capitalize inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium ring-1 ring-inset", {
                            "bg-green-50 text-green-700 ring-green-600/20": request.status === 'approved',
                            "bg-red-50 text-red-700 ring-red-600/10": request.status === 'rejected',
                            "bg-gray-50 text-gray-600 ring-gray-500/10": request.status === 'pending',
                        })}>
                            {request.status}
                        </span>
                    </div>

                    <p className="text-sm font-semibold text-muted-foreground">
                        Ksh. {request.amount.toLocaleString()}
                    </p>
                </div>
                <div className="flex justify-between">
                    <p className="text-xs font-normal text-muted-foreground"> {format(request.incurredAt, 'MMMM dd')}</p>
                    <p className="text-xs font-normal text-muted-foreground">{request.mpesaNumber}</p>
                </div>
            </div>
        </div>
    );
}

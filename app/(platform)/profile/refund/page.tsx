"use client";
import { Icons } from "#/components/icons";
import Link from "next/link";
import { RefundForm } from "./refund-form";

export default function RefundPage() {
  return (
    <>
      <PageHeader />
      <RefundForm />
    </>
  );
}

function PageHeader() {
  return (
    <div className="mt-2 flex justify-end">
      <Link href={"/profile"}>
        <Icons.xIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}

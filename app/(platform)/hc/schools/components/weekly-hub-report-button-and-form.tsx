"use client";

import { Button } from "#/components/ui/button";
import Image from "next/image";
import AddCircleOutlined from "../../../../../public/icons/add-circle-outline.svg";

export default function WeeklyHubReportButtonAndForm() {
  return (
    <Button className="flex items-center gap-2 bg-shamiri-new-blue text-base font-semibold leading-6 text-white">
      <Image
        unoptimized
        priority
        src={AddCircleOutlined}
        alt="Add icon circle outlined"
        width={24}
        height={24}
      />
      Weekly Hub Report
    </Button>
  );
}

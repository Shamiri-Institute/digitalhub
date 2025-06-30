"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export default function InfoCardSkeleton() {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle className="font-semibold leading-6 text-shamiri-black">
          <div className="mb-2.5 h-2.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-4 h-2.5 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
      </CardContent>
    </Card>
  );
}

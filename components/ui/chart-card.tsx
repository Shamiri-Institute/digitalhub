"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";

export default function ChartCard({
  children,
  title,
}: {
  children?: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle className="font-semibold leading-6 text-shamiri-black">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[275px] pt-6">
        {!!children ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center">
            No data available
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t border-dashed px-4 py-[14px]">
        {/* TODO: the change the font type to user Inter in this section */}
        {/* TODO: also change to a link */}
        <p className="font-medium leading-5 text-shamiri-new-blue">
          View Summary
        </p>
      </CardFooter>
    </Card>
  );
}

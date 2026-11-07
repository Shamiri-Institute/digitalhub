"use client";

import type React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

export default function ChartCard({
  children,
  title,
  description,
  showCardFooter = true,
}: {
  children?: React.ReactNode;
  title: string;
  description?: string;
  showCardFooter?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle className="font-semibold leading-6 text-shamiri-black">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {/* Recharts colours legend text with the series colour inline; keep it in text ink. */}
      <CardContent className="h-[275px] pt-6 [&_.recharts-legend-item-text]:text-shamiri-text-dark-grey! [&_.recharts-legend-wrapper]:text-xs">
        {children ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center">No data available</div>
        )}
      </CardContent>
      {showCardFooter && (
        <CardFooter className="border-t border-dashed px-4 py-[14px]">
          <p className="font-medium leading-5 text-shamiri-new-blue">View Summary</p>
        </CardFooter>
      )}
    </Card>
  );
}

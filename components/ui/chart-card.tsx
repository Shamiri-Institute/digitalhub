import type React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

export default function ChartCard({
  children,
  title,
  description,
}: {
  children?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b px-4 py-3.5">
        <CardTitle as="h2" className="text-lg leading-6">
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {/* Recharts colours legend text with the series colour inline; keep it in text ink. */}
      <CardContent className="h-[275px] pt-6 [&_.recharts-legend-item-text]:text-muted-foreground! [&_.recharts-legend-wrapper]:text-xs">
        {children ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

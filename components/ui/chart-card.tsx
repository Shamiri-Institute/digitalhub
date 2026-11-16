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
      <CardContent className="h-[275px] pt-6">
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

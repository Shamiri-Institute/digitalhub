"use client";

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";

export default function InfoCard({
  content,
  title,
}: {
  content?: number;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        <CardTitle className="font-semibold leading-6 text-shamiri-black">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="items-center justify-center text-3xl">{content}</div>
      </CardContent>
    </Card>
  );
}

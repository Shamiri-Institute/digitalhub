import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card";

export default function ChartCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-[14px]">
        <CardTitle className="text-sm font-semibold leading-6 text-shamiri-black">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[307px]">{children}</CardContent>
      <CardFooter className="px-4 py-[14px]">
        {/* TODO: the change the font type to user Inter in this section */}
        {/* TODO: also change to a link */}
        <p className="font-medium leading-5 text-shamiri-new-blue">
          View Summary
        </p>
      </CardFooter>
    </Card>
  );
}

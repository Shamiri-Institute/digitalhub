import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

/** An info card while its figure loads; with a title, the card's own heading shows at once. */
export default function InfoCardSkeleton({ title }: { title?: string }) {
  return (
    <Card>
      <CardHeader className="border-b border-dashed px-4 py-[14px] text-lg">
        {title ? (
          <CardTitle as="h2" className="font-semibold leading-6 text-foreground">
            {title}
          </CardTitle>
        ) : (
          <CardTitle className="font-semibold leading-6 text-foreground">
            <div className="mb-2.5 h-2.5 w-32 rounded-full bg-muted" />
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="pt-3">
        <div className="mb-4 mt-3 h-2.5 w-48 rounded-full bg-muted" />
      </CardContent>
    </Card>
  );
}

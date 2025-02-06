import { Icons } from "#/components/icons";

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Icons.loaderCircle className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );
}

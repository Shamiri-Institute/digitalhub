export default function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <h1 className="text-3xl font-bold leading-tight text-primary lg:text-4xl">{title}</h1>
      {children}
    </div>
  );
}

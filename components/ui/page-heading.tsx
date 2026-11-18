export default function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between lg:flex-row">
      <h1 className="text-4xl font-semibold text-shamiri-black">{title}</h1>
      {children}
    </div>
  );
}

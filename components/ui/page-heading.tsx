export default function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <h2 className="text-4xl font-semibold leading-[48px] text-black">
        {title}
      </h2>
      {children}
    </div>
  );
}

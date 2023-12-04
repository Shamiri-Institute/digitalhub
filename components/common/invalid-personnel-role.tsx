export function InvalidPersonnelRole({
  role,
}: {
  role: "supervisor" | "hub-coordinator";
}) {
  const message =
    role === "supervisor" ? "Not a supervisor" : "Not a hub coordinator";
  return (
    <section className="flex flex-col gap-5">
      <p>{message}</p>
    </section>
  );
}

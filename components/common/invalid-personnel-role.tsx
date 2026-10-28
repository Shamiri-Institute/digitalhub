export function InvalidPersonnelRole({ userRole }: { userRole: "supervisor" | "hub-coordinator" }) {
  const message =
    userRole === "supervisor"
      ? "Not a supervisor with an assigned school"
      : "Not a hub coordinator with an active hub";
  return (
    <section className="flex flex-col gap-5">
      <p>{message}</p>
    </section>
  );
}

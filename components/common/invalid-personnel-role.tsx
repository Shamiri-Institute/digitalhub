import { PersonnelTool } from "#/app/dev-personnel-switcher";

export function InvalidPersonnelRole({
  role,
}: {
  role: "supervisor" | "hub-coordinator";
}) {
  const message =
    role === "supervisor" ? "Not a supervisor" : "Not a hub coordinator";
  return (
    <section>
      <p>{message}</p>
      <div>
        <PersonnelTool />
      </div>
    </section>
  );
}

export const navigation: Array<any> = [
  {
    title: "Students",
    links: [{ title: "List students", href: "/students" }],
  },
  {
    title: "Fellows",
    links: [{ title: "List fellows", href: "/fellows" }],
  },
  {
    title: "Supervisors",
    links: [{ title: "List supervisors", href: "/supervisors" }],
  },
  {
    title: "Screening",
    links: [{ title: "List screenings", href: "/screenings" }],
  },
];

export function Navigation(props: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <div>
      <nav {...props}>
        <ul role="list">
          <div>Students</div>
          <div>Fellows</div>
          <div>Screenings</div>
          <div>Schools</div>
        </ul>
      </nav>
    </div>
  );
}

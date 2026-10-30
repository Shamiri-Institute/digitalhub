import { describe, expect, it } from "vitest";

import { parseTableView, tableViewParams, tableViewSearch } from "#/lib/table-view";

const params = tableViewParams();
const query = (search: string) => {
  const searchParams = new URLSearchParams(search);
  return (name: string) => searchParams.get(name);
};
const studentsTable = {
  lastPageIndex: 69,
  sortableColumnIds: ["Student Name", "Contact no.", "Group Name"],
};

describe("parseTableView", () => {
  it("falls back to the first page and the data's own order", () => {
    expect(parseTableView(query(""), params, studentsTable)).toEqual({
      pageIndex: 0,
      sorting: [],
    });
  });

  it("reads the URL's 1-based page and sort", () => {
    expect(parseTableView(query("page=3&sort=Student+Name.desc"), params, studentsTable)).toEqual({
      pageIndex: 2,
      sorting: [{ id: "Student Name", desc: true }],
    });
  });

  it("clamps a page past the end to the last page", () => {
    expect(parseTableView(query("page=999"), params, studentsTable).pageIndex).toBe(69);
    expect(
      parseTableView(query("page=2"), params, { ...studentsTable, lastPageIndex: 0 }).pageIndex,
    ).toBe(0);
  });

  it("ignores a page that is not a positive whole number", () => {
    for (const page of ["0", "-2", "1.5", "two", "", "2e1", " 2"]) {
      expect(
        parseTableView(query(`page=${encodeURIComponent(page)}`), params, studentsTable).pageIndex,
      ).toBe(0);
    }
  });

  it("reads a column id that contains a dot and several columns in order", () => {
    expect(
      parseTableView(query("sort=Contact+no..asc,Group+Name.desc"), params, studentsTable).sorting,
    ).toEqual([
      { id: "Contact no.", desc: false },
      { id: "Group Name", desc: true },
    ]);
  });

  it("drops a sort on a column the table cannot sort by, or in no direction", () => {
    for (const sort of ["Status.asc", "Student Name", "Student Name.up", ".asc", "Student Name."]) {
      expect(
        parseTableView(query(`sort=${encodeURIComponent(sort)}`), params, studentsTable).sorting,
      ).toEqual([]);
    }
    expect(
      parseTableView(query("sort=Status.asc,Group+Name.asc"), params, studentsTable).sorting,
    ).toEqual([{ id: "Group Name", desc: false }]);
  });

  it("reads only its own prefix's params", () => {
    const myCases = tableViewParams("myCases");
    expect(
      parseTableView(
        query("page=4&myCases.page=2&myCases.sort=Group+Name.asc"),
        myCases,
        studentsTable,
      ),
    ).toEqual({ pageIndex: 1, sorting: [{ id: "Group Name", desc: false }] });
  });
});

describe("tableViewSearch", () => {
  it("writes the page 1-based and keeps the page's other params", () => {
    expect(
      tableViewSearch("?query=sch_1", params, {
        pageIndex: 1,
        sorting: [{ id: "Student Name", desc: true }],
      }),
    ).toBe("?query=sch_1&page=2&sort=Student+Name.desc");
  });

  it("leaves the first page and the data's own order out of the URL", () => {
    expect(
      tableViewSearch("?page=4&sort=Student+Name.asc", params, { pageIndex: 0, sorting: [] }),
    ).toBe("");
    expect(tableViewSearch("?query=sch_1&page=4", params, { pageIndex: 0, sorting: [] })).toBe(
      "?query=sch_1",
    );
  });

  it("round-trips through parseTableView", () => {
    const view = {
      pageIndex: 5,
      sorting: [
        { id: "Contact no.", desc: true },
        { id: "Student Name", desc: false },
      ],
    };
    const myCases = tableViewParams("myCases");
    const search = tableViewSearch("?page=2", myCases, view);
    expect(parseTableView(query(search), myCases, studentsTable)).toEqual(view);
    expect(parseTableView(query(search), params, studentsTable).pageIndex).toBe(1);
  });
});

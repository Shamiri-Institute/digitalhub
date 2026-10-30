import { describe, expect, it } from "vitest";

import {
  compareCellValues,
  parseTableView,
  rowIdsFromOwnIds,
  tableViewParams,
  tableViewSearch,
} from "#/lib/table-view";

const params = tableViewParams();
const query = (search: string) => {
  const searchParams = new URLSearchParams(search);
  return (name: string) => searchParams.get(name);
};
// A seeded school's students: 70 pages of 10, 35 of 20.
const studentCount = 695;
// Some of the students table's sortable columns.
const studentColumnIds = ["Student Name", "Group Name", "Contact no.", "Date added"];
const parse = (search: string, tableParams = params, rowCount = studentCount) =>
  parseTableView(query(search), tableParams, rowCount, studentColumnIds);
const firstPage = { pageIndex: 0, pageSize: 10 };

describe("parseTableView", () => {
  it("falls back to the first page of 10, unsorted", () => {
    expect(parse("")).toEqual({ pagination: firstPage, sorting: [] });
  });

  it("reads the URL's 1-based page and its size", () => {
    expect(parse("page=3&size=20").pagination).toEqual({ pageIndex: 2, pageSize: 20 });
  });

  it("clamps a page past the end to the last page at the URL's size", () => {
    expect(parse("page=999").pagination.pageIndex).toBe(69);
    expect(parse("page=999&size=50").pagination.pageIndex).toBe(13);
    expect(parse("page=50&size=20").pagination.pageIndex).toBe(34);
    expect(parse("page=2", params, 0).pagination.pageIndex).toBe(0);
  });

  it("ignores a page that is not a positive whole number", () => {
    for (const page of ["0", "-2", "1.5", "two", "", "2e1", " 2"]) {
      expect(parse(`page=${encodeURIComponent(page)}`).pagination.pageIndex).toBe(0);
    }
  });

  it("falls back to 10 for a size the page-size control does not offer", () => {
    for (const size of ["7", "0", "100", "20.0", "twenty", ""]) {
      expect(parse(`page=2&size=${encodeURIComponent(size)}`).pagination).toEqual({
        pageIndex: 1,
        pageSize: 10,
      });
    }
  });

  it("reads the sorted column and its direction", () => {
    expect(parse("sort=Student+Name.asc").sorting).toEqual([{ id: "Student Name", desc: false }]);
    expect(parse("sort=Date%20added.desc").sorting).toEqual([{ id: "Date added", desc: true }]);
  });

  it("splits a column id with a dot in it at the last dot", () => {
    expect(parse("sort=Contact+no..desc").sorting).toEqual([{ id: "Contact no.", desc: true }]);
  });

  it("drops a sort on a column the table cannot sort by, or with no direction", () => {
    for (const sort of [
      "Status.asc",
      "button.desc",
      "Student Name",
      "Student Name.",
      "Student Name.up",
      "Student Name.ASC",
      ".asc",
      "asc",
      "",
    ]) {
      expect(parse(`sort=${encodeURIComponent(sort)}`).sorting).toEqual([]);
    }
  });

  it("reads only its own prefix's params", () => {
    const myCases = tableViewParams("myCases");
    expect(
      parse(
        "page=4&size=50&sort=Group+Name.asc&myCases.page=2&myCases.size=5&myCases.sort=Student+Name.desc",
        myCases,
      ),
    ).toEqual({
      pagination: { pageIndex: 1, pageSize: 5 },
      sorting: [{ id: "Student Name", desc: true }],
    });
  });
});

describe("tableViewSearch", () => {
  it("writes the page 1-based with its size and sort, and keeps the page's other params", () => {
    expect(
      tableViewSearch("?query=sch_1", params, {
        pagination: { pageIndex: 1, pageSize: 20 },
        sorting: [{ id: "Date added", desc: true }],
      }),
    ).toBe("?query=sch_1&page=2&size=20&sort=Date+added.desc");
  });

  it("leaves the first page, the default size and no sort out of the URL", () => {
    const unsortedFirstPage = { pagination: firstPage, sorting: [] };
    expect(tableViewSearch("?page=4&size=20&sort=Group+Name.asc", params, unsortedFirstPage)).toBe(
      "",
    );
    expect(tableViewSearch("?query=sch_1&page=4", params, unsortedFirstPage)).toBe("?query=sch_1");
  });

  it("round-trips through parseTableView", () => {
    const view = {
      pagination: { pageIndex: 5, pageSize: 30 },
      sorting: [{ id: "Contact no.", desc: false }],
    };
    const myCases = tableViewParams("myCases");
    const search = tableViewSearch("?page=2&sort=Group+Name.desc", myCases, view);
    expect(parse(search, myCases)).toEqual(view);
    expect(parse(search)).toEqual({
      pagination: { pageIndex: 1, pageSize: 10 },
      sorting: [{ id: "Group Name", desc: true }],
    });
  });
});

describe("compareCellValues", () => {
  const sorted = (values: unknown[]) => values.toSorted(compareCellValues);

  it("orders text naturally, whatever its case", () => {
    expect(sorted(["Group 10", "group 2", "Group 1"])).toEqual(["Group 1", "group 2", "Group 10"]);
    expect(sorted(["zawadi", "Baraka", "amani"])).toEqual(["amani", "Baraka", "zawadi"]);
    expect(sorted(["15 yrs", "9 yrs", "N/A", "12 yrs"])).toEqual([
      "9 yrs",
      "12 yrs",
      "15 yrs",
      "N/A",
    ]);
  });

  it("orders dates by time and numbers by size", () => {
    const march = new Date("2026-03-02");
    const october = new Date("2026-10-01");
    expect(sorted([october, march])).toEqual([march, october]);
    expect(sorted([3.5, 3.25, 10, -1])).toEqual([-1, 3.25, 3.5, 10]);
  });

  it("puts empty values after the rest", () => {
    const invalidDate = new Date("not a date");
    expect(sorted([null, "b", "", "a"])).toEqual(["a", "b", null, ""]);
    expect(compareCellValues(undefined, "a")).toBeGreaterThan(0);
    expect(sorted([Number.NaN, 2, null, 1])).toEqual([1, 2, Number.NaN, null]);
    expect(sorted([invalidDate, new Date(0)])).toEqual([new Date(0), invalidDate]);
  });
});

describe("rowIdsFromOwnIds", () => {
  const rowIds = <TData>(data: TData[]) => data.map(rowIdsFromOwnIds(data));

  it("keys rows by their own ids, so a reorder keeps each row's key", () => {
    const students = [{ id: "stu_b" }, { id: "stu_a" }, { id: 7 }];
    expect(rowIds(students)).toEqual(["stu_b", "stu_a", "7"]);
    expect(rowIds(students.toReversed())).toEqual(["7", "stu_a", "stu_b"]);
  });

  it("keys a row with no usable id by its index", () => {
    // Unmarked attendance rows carry `id: undefined`; skeleton rows `id: ""` or no id at all.
    const rows = [{ id: "att_1" }, { id: undefined }, { id: "" }, {}, { id: Number.NaN }, null];
    expect(rowIds(rows)).toEqual(["att_1", "index:1", "index:2", "index:3", "index:4", "index:5"]);
  });

  it("keys rows that share an id by their index", () => {
    // A school's fellows list has one row per group a fellow leads.
    const fellows = [{ id: "fel_1" }, { id: "fel_2" }, { id: "fel_1" }, { id: 3 }, { id: "3" }];
    expect(rowIds(fellows)).toEqual(["index:0", "fel_2", "index:2", "index:3", "index:4"]);
  });
});

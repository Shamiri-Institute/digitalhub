import { describe, expect, it } from "vitest";

import {
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

describe("parseTableView", () => {
  it("falls back to the first page of 10", () => {
    expect(parseTableView(query(""), params, studentCount)).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it("reads the URL's 1-based page and its size", () => {
    expect(parseTableView(query("page=3&size=20"), params, studentCount)).toEqual({
      pageIndex: 2,
      pageSize: 20,
    });
  });

  it("clamps a page past the end to the last page at the URL's size", () => {
    expect(parseTableView(query("page=999"), params, studentCount).pageIndex).toBe(69);
    expect(parseTableView(query("page=999&size=50"), params, studentCount).pageIndex).toBe(13);
    expect(parseTableView(query("page=50&size=20"), params, studentCount).pageIndex).toBe(34);
    expect(parseTableView(query("page=2"), params, 0).pageIndex).toBe(0);
  });

  it("ignores a page that is not a positive whole number", () => {
    for (const page of ["0", "-2", "1.5", "two", "", "2e1", " 2"]) {
      expect(
        parseTableView(query(`page=${encodeURIComponent(page)}`), params, studentCount).pageIndex,
      ).toBe(0);
    }
  });

  it("falls back to 10 for a size the page-size control does not offer", () => {
    for (const size of ["7", "0", "100", "20.0", "twenty", ""]) {
      expect(
        parseTableView(query(`page=2&size=${encodeURIComponent(size)}`), params, studentCount),
      ).toEqual({ pageIndex: 1, pageSize: 10 });
    }
  });

  it("reads only its own prefix's params", () => {
    const myCases = tableViewParams("myCases");
    expect(
      parseTableView(query("page=4&size=50&myCases.page=2&myCases.size=5"), myCases, studentCount),
    ).toEqual({ pageIndex: 1, pageSize: 5 });
  });
});

describe("tableViewSearch", () => {
  it("writes the page 1-based with its size and keeps the page's other params", () => {
    expect(tableViewSearch("?query=sch_1", params, { pageIndex: 1, pageSize: 20 })).toBe(
      "?query=sch_1&page=2&size=20",
    );
  });

  it("leaves the first page and the default size out of the URL", () => {
    expect(tableViewSearch("?page=4&size=20", params, { pageIndex: 0, pageSize: 10 })).toBe("");
    expect(tableViewSearch("?query=sch_1&page=4", params, { pageIndex: 0, pageSize: 10 })).toBe(
      "?query=sch_1",
    );
  });

  it("round-trips through parseTableView", () => {
    const pagination = { pageIndex: 5, pageSize: 30 };
    const myCases = tableViewParams("myCases");
    const search = tableViewSearch("?page=2", myCases, pagination);
    expect(parseTableView(query(search), myCases, studentCount)).toEqual(pagination);
    expect(parseTableView(query(search), params, studentCount)).toEqual({
      pageIndex: 1,
      pageSize: 10,
    });
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

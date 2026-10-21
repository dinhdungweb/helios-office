import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { ListQueryDto, MAX_PAGE_SIZE, pageArgs, paginated, sortArgs } from "./list-query";

function parse(query: Record<string, string>) {
  const dto = plainToInstance(ListQueryDto, query);
  return { dto, errors: validateSync(dto) };
}

describe("ListQueryDto", () => {
  it("accepts an empty query", () => {
    expect(parse({}).errors).toHaveLength(0);
  });

  it("converts numeric strings", () => {
    const { dto, errors } = parse({ page: "3", limit: "20" });
    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({ page: 3, limit: 20 });
  });

  it.each([
    [{ page: "0" }],
    [{ limit: String(MAX_PAGE_SIZE + 1) }],
    [{ order: "sideways" }],
    [{ sort: "name; drop table" }]
  ])("rejects %j", (query) => {
    expect(parse(query).errors.length).toBeGreaterThan(0);
  });
});

describe("pagination helpers", () => {
  it("computes skip/take with defaults", () => {
    expect(pageArgs({})).toEqual({ page: 1, limit: 50, skip: 0, take: 50 });
    expect(pageArgs({ page: 3, limit: 20 })).toEqual({ page: 3, limit: 20, skip: 40, take: 20 });
  });

  it("only sorts by whitelisted fields", () => {
    expect(sortArgs({ sort: "createdAt", order: "asc" }, ["createdAt", "name"] as const, "name")).toEqual({ createdAt: "asc" });
    expect(sortArgs({ sort: "passwordHash" }, ["createdAt", "name"] as const, "name")).toEqual({ name: "desc" });
  });

  it("wraps items with totals", () => {
    expect(paginated(["a", "b"], 5, { page: 1, limit: 2 })).toEqual({ items: ["a", "b"], total: 5, page: 1, limit: 2, pageCount: 3 });
    expect(paginated([], 0, {})).toMatchObject({ pageCount: 1 });
  });
});

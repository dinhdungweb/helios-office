import { directManagerOf, resolveApprovers, type OrgChart, type OrgDepartment, type OrgEmployee, type ResolveInput } from "./approvers";

const departments: OrgDepartment[] = [
  { id: "hq", parentId: null, headId: "ceo", permissionStructure: "company" },
  { id: "sales", parentId: "hq", headId: "sales-head", permissionStructure: "department" },
  { id: "branch2", parentId: "hq", headId: "b2-head", permissionStructure: "branch" },
  { id: "b2-team", parentId: "branch2", headId: null, permissionStructure: "department" },
  { id: "empty", parentId: "hq", headId: null, permissionStructure: "department" }
];

const person = (id: string, departmentId: string, managerId: string | null, extra: Partial<OrgEmployee> = {}): OrgEmployee => ({
  id,
  departmentId,
  managerId,
  positionId: null,
  jobTitleId: null,
  active: true,
  ...extra
});

const employees: OrgEmployee[] = [
  person("ceo", "hq", null),
  person("sales-head", "sales", "ceo"),
  person("staff", "sales", "sales-head"),
  person("no-manager", "sales", null),
  person("acct-hq", "sales", "sales-head", { positionId: "pos-acct", jobTitleId: "title-lead" }),
  person("b2-head", "branch2", "ceo"),
  person("acct-b2", "b2-team", "b2-head", { positionId: "pos-acct" }),
  person("b2-staff", "b2-team", null),
  person("gone", "sales", "sales-head", { active: false }),
  person("reports-to-gone", "sales", "gone"),
  person("deputy", "sales", "sales-head"),
  person("admin", "hq", "ceo")
];

const org: OrgChart = {
  employees: new Map(employees.map((item) => [item.id, item])),
  departments: new Map(departments.map((item) => [item.id, item]))
};

const input = (overrides: Partial<ResolveInput>): ResolveInput => ({
  approverValue: "automatic:direct_manager",
  requesterId: "staff",
  requestType: "leave",
  selfApproval: "skip",
  escalateIfOnlySelf: false,
  delegations: [],
  fallbackAdminIds: ["admin"],
  ...overrides
});

const ids = (result: ReturnType<typeof resolveApprovers>) => result.assignees.map((item) => `${item.employeeId}:${item.resolvedFrom}`);

describe("directManagerOf", () => {
  it.each([
    ["the manager on the profile", "staff", "sales-head"],
    ["the department head when no manager is set", "no-manager", "sales-head"],
    ["the parent department head for a head", "sales-head", "ceo"],
    ["the department head when the manager left", "reports-to-gone", "sales-head"],
    ["a head higher up when the team has none", "b2-staff", "b2-head"],
    ["nobody above the top", "ceo", null]
  ])("%s", (_name, employeeId, expected) => {
    expect(directManagerOf(org, employeeId)).toBe(expected);
  });
});

describe("resolveApprovers", () => {
  it("resolves the direct manager", () => {
    expect(ids(resolveApprovers(org, input({})))).toEqual(["sales-head:direct_manager"]);
  });

  it("resolves the manager's manager as supervisor", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "automatic:creator_supervisor" })))).toEqual(["ceo:supervisor"]);
  });

  it("resolves a named employee and a department head", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "deputy, department:branch2" })))).toEqual(["deputy:employee", "b2-head:department_head"]);
  });

  it("limits positions and titles to the requester's unit", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "position:pos-acct" })))).toEqual(["acct-hq:position"]);
    expect(ids(resolveApprovers(org, input({ approverValue: "position:pos-acct", requesterId: "b2-staff" })))).toEqual(["acct-b2:position"]);
    expect(ids(resolveApprovers(org, input({ approverValue: "title:title-lead" })))).toEqual(["acct-hq:title"]);
  });

  it("drops people who left", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "gone, deputy" })))).toEqual(["deputy:employee"]);
  });

  it("adds the delegate next to the approver", () => {
    const result = resolveApprovers(org, input({ delegations: [{ delegatorId: "sales-head", delegateId: "deputy", requestTypes: [] }] }));
    expect(result.assignees).toEqual([
      { employeeId: "sales-head", resolvedFrom: "direct_manager" },
      { employeeId: "deputy", resolvedFrom: "delegation", onBehalfOfId: "sales-head" }
    ]);
  });

  it("ignores a delegation for other request types", () => {
    const result = resolveApprovers(org, input({ delegations: [{ delegatorId: "sales-head", delegateId: "deputy", requestTypes: ["overtime"] }] }));
    expect(ids(result)).toEqual(["sales-head:direct_manager"]);
  });

  it("skips a step that only finds the requester", () => {
    expect(resolveApprovers(org, input({ approverValue: "department:sales", requesterId: "sales-head" }))).toEqual({ assignees: [], skip: true, needsAttention: false });
  });

  it("escalates to the requester's manager when that step is the last approval", () => {
    const result = resolveApprovers(org, input({ approverValue: "department:sales", requesterId: "sales-head", escalateIfOnlySelf: true }));
    expect(ids(result)).toEqual(["ceo:escalation"]);
  });

  it("lets the requester approve when the node allows it", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "department:sales", requesterId: "sales-head", selfApproval: "allow" })))).toEqual([
      "sales-head:department_head"
    ]);
  });

  it("falls back to the substitute, then to admins with a warning", () => {
    expect(ids(resolveApprovers(org, input({ approverValue: "department:empty", substituteValue: "deputy" })))).toEqual(["deputy:substitute"]);

    const fallback = resolveApprovers(org, input({ approverValue: "department:empty" }));
    expect(ids(fallback)).toEqual(["admin:fallback_admin"]);
    expect(fallback.needsAttention).toBe(true);
  });

  it("still hands the request to an admin who is the requester when nobody else exists", () => {
    const result = resolveApprovers(org, input({ approverValue: "department:empty", requesterId: "admin" }));
    expect(ids(result)).toEqual(["admin:fallback_admin"]);
  });

  it("ignores dynamic values meant for notifications", () => {
    expect(resolveApprovers(org, input({ approverValue: "dynamic:created_by" })).needsAttention).toBe(true);
  });
});

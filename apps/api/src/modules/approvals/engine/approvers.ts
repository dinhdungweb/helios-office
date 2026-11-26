import { splitAudience } from "./flow";

// Who must act on an approval step (docs/design/approval-engine.md §5.5). Pure: the caller loads the
// org chart (≈200 people) and active delegations.

export type OrgEmployee = {
  id: string;
  managerId: string | null;
  departmentId: string;
  positionId: string | null;
  jobTitleId: string | null;
  // Active employee with a usable account.
  active: boolean;
};

export type OrgDepartment = { id: string; parentId: string | null; headId: string | null; permissionStructure: string };

export type OrgChart = { employees: Map<string, OrgEmployee>; departments: Map<string, OrgDepartment> };

export type Delegation = { delegatorId: string; delegateId: string; requestTypes: string[] };

export type ResolvedFrom =
  | "employee"
  | "direct_manager"
  | "supervisor"
  | "department_head"
  | "position"
  | "title"
  | "delegation"
  | "substitute"
  | "fallback_admin"
  | "escalation"
  | "forward";

export type ResolvedAssignee = { employeeId: string; resolvedFrom: ResolvedFrom; onBehalfOfId?: string };

export type ResolveInput = {
  approverValue: string;
  substituteValue?: string;
  requesterId: string;
  requestType: string;
  selfApproval: "skip" | "allow";
  // When the step resolves to the requester alone and no approval step follows, the requester's
  // manager approves instead of skipping (decision 3 of §13).
  escalateIfOnlySelf: boolean;
  delegations: Delegation[];
  fallbackAdminIds: string[];
};

export type ResolveResult = {
  assignees: ResolvedAssignee[];
  // Nobody but the requester: the step is skipped.
  skip: boolean;
  // Handed to admins because nobody else could be found.
  needsAttention: boolean;
};

// Head of the person's department, or of the nearest ancestor whose head is someone else.
function departmentHeadAbove(org: OrgChart, person: OrgEmployee): string | null {
  const visited = new Set<string>();
  let department = org.departments.get(person.departmentId);
  while (department && !visited.has(department.id)) {
    visited.add(department.id);
    const head = department.headId ? org.employees.get(department.headId) : undefined;
    if (head && head.id !== person.id && head.active) return head.id;
    department = department.parentId ? org.departments.get(department.parentId) : undefined;
  }
  return null;
}

export function directManagerOf(org: OrgChart, personId: string): string | null {
  const person = org.employees.get(personId);
  if (!person) return null;
  const manager = person.managerId ? org.employees.get(person.managerId) : undefined;
  if (manager && manager.active && manager.id !== person.id) return manager.id;
  return departmentHeadAbove(org, person);
}

const UNIT_BOUNDARIES = new Set(["branch", "company"]);

// Departments of the requester's unit: the subtree of the nearest branch / company ancestor,
// without the subtrees of other branches below it (a head-office request never goes to a branch's
// accountant).
function sameUnit(org: OrgChart, requesterId: string): Set<string> {
  const requester = org.employees.get(requesterId);
  if (!requester) return new Set();
  const all = [...org.departments.values()];
  let rootId = requester.departmentId;
  const visited = new Set<string>();
  for (let current = org.departments.get(rootId); current && !visited.has(current.id); current = current.parentId ? org.departments.get(current.parentId) : undefined) {
    visited.add(current.id);
    rootId = current.id;
    if (UNIT_BOUNDARIES.has(current.permissionStructure)) break;
  }
  const children = new Map<string, OrgDepartment[]>();
  for (const department of all) {
    if (department.parentId) children.set(department.parentId, [...(children.get(department.parentId) ?? []), department]);
  }
  const unit = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (unit.has(child.id) || UNIT_BOUNDARIES.has(child.permissionStructure)) continue;
      unit.add(child.id);
      queue.push(child.id);
    }
  }
  return unit;
}

function resolveValue(org: OrgChart, value: string, requesterId: string): ResolvedAssignee[] {
  const [kind, id] = value.includes(":") ? [value.slice(0, value.indexOf(":")), value.slice(value.indexOf(":") + 1)] : ["employee", value];
  const pick = (ids: Array<string | null>, resolvedFrom: ResolvedFrom) =>
    ids.filter((item): item is string => Boolean(item)).map((employeeId) => ({ employeeId, resolvedFrom }));

  switch (kind) {
    case "employee":
      return pick([id], "employee");
    case "automatic":
      if (id === "direct_manager") return pick([directManagerOf(org, requesterId)], "direct_manager");
      if (id === "creator_supervisor") {
        const manager = directManagerOf(org, requesterId);
        return pick([manager ? directManagerOf(org, manager) : null], "supervisor");
      }
      return [];
    case "department":
      return pick([org.departments.get(id)?.headId ?? null], "department_head");
    case "position":
    case "title": {
      const unit = sameUnit(org, requesterId);
      const holders = [...org.employees.values()].filter(
        (employee) => unit.has(employee.departmentId) && (kind === "position" ? employee.positionId === id : employee.jobTitleId === id)
      );
      return pick(holders.map((employee) => employee.id), kind);
    }
    default:
      // dynamic:* values are for notification recipients only.
      return [];
  }
}

// Everyone an audience value points at (active people only), without the approval rules. Also used
// for the recipients of notification / email nodes.
export function resolveAudience(org: OrgChart, value: string | undefined, requesterId: string) {
  const seen = new Set<string>();
  const result: ResolvedAssignee[] = [];
  for (const item of splitAudience(value).flatMap((part) => resolveValue(org, part, requesterId))) {
    if (seen.has(item.employeeId) || !org.employees.get(item.employeeId)?.active) continue;
    seen.add(item.employeeId);
    result.push(item);
  }
  return result;
}

function withDelegates(org: OrgChart, assignees: ResolvedAssignee[], input: ResolveInput) {
  const result = [...assignees];
  const present = new Set(assignees.map((item) => item.employeeId));
  for (const assignee of assignees) {
    for (const delegation of input.delegations) {
      if (delegation.delegatorId !== assignee.employeeId) continue;
      if (delegation.requestTypes.length > 0 && !delegation.requestTypes.includes(input.requestType)) continue;
      if (present.has(delegation.delegateId) || !org.employees.get(delegation.delegateId)?.active) continue;
      present.add(delegation.delegateId);
      result.push({ employeeId: delegation.delegateId, resolvedFrom: "delegation", onBehalfOfId: assignee.employeeId });
    }
  }
  return result;
}

export function resolveApprovers(org: OrgChart, input: ResolveInput): ResolveResult {
  const withoutRequester = (list: ResolvedAssignee[]) =>
    input.selfApproval === "skip" ? list.filter((item) => item.employeeId !== input.requesterId) : list;

  const primary = withDelegates(org, resolveAudience(org, input.approverValue, input.requesterId), input);
  const assignees = withoutRequester(primary);
  if (assignees.length > 0) return { assignees, skip: false, needsAttention: false };

  // Only the requester was found.
  if (primary.length > 0) {
    if (!input.escalateIfOnlySelf) return { assignees: [], skip: true, needsAttention: false };
    const manager = directManagerOf(org, input.requesterId);
    if (manager) {
      const escalated = withoutRequester(withDelegates(org, [{ employeeId: manager, resolvedFrom: "escalation" }], input));
      if (escalated.length > 0) return { assignees: escalated, skip: false, needsAttention: false };
    }
  }

  const substitutes = withoutRequester(
    withDelegates(org, resolveAudience(org, input.substituteValue, input.requesterId).map((item) => ({ ...item, resolvedFrom: "substitute" as const })), input)
  );
  if (substitutes.length > 0) return { assignees: substitutes, skip: false, needsAttention: false };

  const activeAdmins = input.fallbackAdminIds.filter((id) => org.employees.get(id)?.active);
  const admins = activeAdmins.filter((id) => id !== input.requesterId);
  const fallback = (admins.length > 0 ? admins : activeAdmins).map((employeeId) => ({ employeeId, resolvedFrom: "fallback_admin" as const }));
  return { assignees: fallback, skip: false, needsAttention: true };
}

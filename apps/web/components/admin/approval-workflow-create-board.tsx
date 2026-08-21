"use client";

import { useActionState, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormCheckbox } from "@/components/ui/form-controls";
import type { EmployeeDirectoryRecord } from "@/lib/employee-directory-api";
import { createApprovalWorkflowAction, type ApprovalWorkflowFormState } from "@/lib/approval-workflow-actions";
import { ArrowRight, Bell, BookmarkSimple, CaretDown, CheckCircle, CurvePath, EnvelopeSimple, FitToScreen, FlowConnection, MagnifyingGlass, Network, Plus, ShieldCheck, SquaresFour, User, WarningCircle, X } from "@/lib/icons";

const initialState: ApprovalWorkflowFormState = { ok: false };

type WorkflowPickerOption = {
  value: string;
  label: string;
  description?: string;
};

type WorkflowPickerGroup = {
  label?: string;
  options: WorkflowPickerOption[];
};

const workflowObjectGroups: WorkflowPickerGroup[] = [{
  label: "Nhân sự",
  options: [
    { value: "personnel_profile", label: "Cập nhật thông tin" },
    { value: "decision", label: "Quyết định" }
  ]
}];

const decisionSubObjectGroups: WorkflowPickerGroup[] = [{
  options: [
    { value: "reward", label: "Quyết định khen thưởng" },
    { value: "transfer", label: "Quyết định điều chuyển" },
    { value: "salary_adjustment", label: "Quyết định điều chỉnh lương" },
    { value: "discipline", label: "Quyết định kỷ luật lao động" },
    { value: "reception", label: "Quyết định tiếp nhận" },
    { value: "appointment", label: "Quyết định bổ nhiệm" },
    { value: "dismissal", label: "Quyết định miễn nhiệm" },
    { value: "contract_termination", label: "Quyết định chấm dứt HĐLĐ" }
  ]
}];

const approvalTypeGroups: WorkflowPickerGroup[] = [{
  options: [
    {
      value: "workflow",
      label: "Quy trình duyệt",
      description: "Duyệt theo thứ tự các bước với các điều kiện và người duyệt khác nhau."
    },
    {
      value: "approver_option",
      label: "Tùy chọn người duyệt",
      description: "Quy trình này chỉ bao gồm các bước duyệt, trong đó mỗi bước sẽ có danh sách các người thực hiện việc duyệt"
    }
  ]
}];

const workflowNodeOptions = [
  {
    value: "approval",
    label: "Bước duyệt",
    description: "Cài đặt những người hoặc bộ phận có thẩm quyền duyệt. Người hoặc bộ phận này có trách nhiệm xem xét thông tin và đưa ra quyết định duyệt hoặc không duyệt."
  },
  {
    value: "condition",
    label: "Điều kiện",
    description: "Cài đặt điều kiện chuyển tiếp giữa các bước duyệt, có thể cài đặt nhiều điều kiện khác nhau tại 1 node để tạo luồng chạy cho quy trình duyệt theo nhánh thỏa mãn hoặc không thỏa mãn."
  },
  {
    value: "notification",
    label: "Gửi thông báo",
    description: "Khi quy trình chạy đến node này, hệ thống sẽ tự động gửi thông báo cho người dùng được cài đặt qua hộp thông báo."
  },
  {
    value: "email",
    label: "Gửi email",
    description: "Khi quy trình chạy đến node này, hệ thống sẽ tự động gửi email đến những người được cài đặt trong node email."
  },
  {
    value: "approved",
    label: "Đã duyệt",
    description: "Hoàn thành quy trình duyệt, trạng thái của đối tượng cần duyệt chuyển thành Đã duyệt."
  },
  {
    value: "rejected",
    label: "Không duyệt",
    description: "Hủy bỏ quy trình duyệt."
  }
] as const;

type WorkflowNodeType = (typeof workflowNodeOptions)[number]["value"];

type ApprovalNodeOverdueAction = "auto_approve" | "auto_reject" | "substitute" | "none";

type ApprovalNodeConfig = {
  name: string;
  code: string;
  approverId: string;
  followerId: string;
  substituteId: string;
  deadlineDays: string;
  deadlineHours: string;
  deadlineMinutes: string;
  overdueAction: ApprovalNodeOverdueAction;
};

const createEmptyApprovalNodeConfig = (): ApprovalNodeConfig => ({
  name: "",
  code: "",
  approverId: "",
  followerId: "",
  substituteId: "",
  deadlineDays: "",
  deadlineHours: "",
  deadlineMinutes: "",
  overdueAction: "none"
});

type ConditionOperandType = "field" | "value";
type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "greater_than" | "less_than";
type ConditionFunction = "" | "round" | "month" | "year";

type ConditionClause = {
  id: string;
  leftFunction?: ConditionFunction;
  field: string;
  operator: ConditionOperator | "";
  rightType: ConditionOperandType;
  rightValue: string;
};

type ConditionGroup = {
  id: string;
  clauses: ConditionClause[];
};

type ConditionNodeConfig = {
  name: string;
  groups: ConditionGroup[];
};

const createEmptyConditionClause = (id = "clause-1"): ConditionClause => ({
  id,
  field: "",
  operator: "",
  rightType: "field",
  rightValue: ""
});

const createEmptyConditionConfig = (name: string): ConditionNodeConfig => ({
  name,
  groups: [{ id: "group-1", clauses: [createEmptyConditionClause()] }]
});

const conditionFieldOptions = [
  { value: "created_by", label: "Người tạo" },
  { value: "department", label: "Phòng ban" },
  { value: "position", label: "Vị trí" },
  { value: "job_title", label: "Chức vụ" },
  { value: "status", label: "Trạng thái" },
  { value: "approval_by", label: "Người duyệt" },
  { value: "approved_at", label: "Ngày duyệt" },
  { value: "created_at", label: "Ngày tạo" },
  { value: "approval_deadline", label: "Thời hạn duyệt" }
] as const;

const conditionFunctionOptions: Array<{ value: Exclude<ConditionFunction, "">; label: string; description: string }> = [
  { value: "round", label: "ROUND", description: "Làm tròn số" },
  { value: "month", label: "MONTH", description: "Lấy ra tháng của giá trị ngày" },
  { value: "year", label: "YEAR", description: "Lấy ra năm của giá trị ngày" }
];

const conditionOperatorOptions: Array<{ value: ConditionOperator; label: string }> = [
  { value: "equals", label: "Bằng" },
  { value: "not_equals", label: "Không bằng" },
  { value: "contains", label: "Chứa" },
  { value: "not_contains", label: "Không chứa" },
  { value: "greater_than", label: "Lớn hơn" },
  { value: "less_than", label: "Nhỏ hơn" }
];

type ConditionBranchOutcome = "matched" | "unmatched";
type WorkflowBranch = "default" | ConditionBranchOutcome | `${ConditionBranchOutcome}:${string}`;
type WorkflowEdgeStyle = "straight" | "curved";

type ConditionSlot = {
  id: string;
  config?: ConditionNodeConfig;
};

type WorkflowCanvasNode = {
  id: string;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  approvalConfig?: ApprovalNodeConfig;
  conditionConfig?: ConditionNodeConfig;
  conditionSlots?: ConditionSlot[];
};

type WorkflowCanvasEdge = {
  id: string;
  source: string;
  target: string;
  branch?: WorkflowBranch;
};

type WorkflowConnectionDraft = {
  source: string;
  branch: WorkflowBranch;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type WorkflowEdgePath = WorkflowCanvasEdge & {
  path: string;
  labelX?: number;
  labelY?: number;
};

type WorkflowNodeDrag = {
  nodeId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  maxX: number;
  maxY: number;
};

function buildStraightWorkflowPath(startX: number, startY: number, endX: number, endY: number) {
  if (Math.abs(endY - startY) < 1) return `M ${startX} ${startY} H ${endX}`;

  const availableDistance = Math.max(88, endX - startX);
  const elbowX = startX + Math.min(120, availableDistance / 2);
  const verticalDirection = endY >= startY ? 1 : -1;
  const cornerRadius = Math.min(
    8,
    Math.abs(endY - startY) / 2,
    Math.max(0, (elbowX - startX) / 2),
    Math.max(0, (endX - elbowX) / 2)
  );

  return [
    `M ${startX} ${startY}`,
    `H ${elbowX - cornerRadius}`,
    `Q ${elbowX} ${startY} ${elbowX} ${startY + verticalDirection * cornerRadius}`,
    `V ${endY - verticalDirection * cornerRadius}`,
    `Q ${elbowX} ${endY} ${elbowX + cornerRadius} ${endY}`,
    `H ${endX}`
  ].join(" ");
}

function buildCurvedWorkflowPath(startX: number, startY: number, endX: number, endY: number) {
  const controlOffset = Math.max(48, Math.abs(endX - startX) / 2);
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
}

function getConditionSlots(node: WorkflowCanvasNode): ConditionSlot[] {
  if (node.conditionSlots?.length) return node.conditionSlots;
  return [{ id: `${node.id}:condition-1`, config: node.conditionConfig }];
}

function isMatchedWorkflowBranch(branch: WorkflowBranch | undefined) {
  return branch === "matched" || branch?.startsWith("matched:") === true;
}

function isUnmatchedWorkflowBranch(branch: WorkflowBranch | undefined) {
  return branch === "unmatched" || branch?.startsWith("unmatched:") === true;
}

function getWorkflowBranchSlotId(branch: WorkflowBranch | undefined) {
  const separatorIndex = branch?.indexOf(":") ?? -1;
  return separatorIndex >= 0 ? branch?.slice(separatorIndex + 1) : undefined;
}

type WorkflowNodeContextMenuState = {
  nodeId: string;
  conditionSlotId?: string;
  x: number;
  y: number;
  opensLeft: boolean;
};

function WorkflowNodeTypeIcon({ type, size = 34 }: { type: WorkflowNodeType; size?: number }) {
  if (type === "approval") return <ShieldCheck size={size} aria-hidden="true" />;
  if (type === "condition") return <Network size={size} aria-hidden="true" />;
  if (type === "notification") return <Bell size={size} aria-hidden="true" />;
  if (type === "email") return <EnvelopeSimple size={size} aria-hidden="true" />;
  if (type === "approved") return <CheckCircle size={size} aria-hidden="true" />;
  return <X size={Math.max(size - 4, 16)} aria-hidden="true" />;
}

function WorkflowCanvasNodeCard({
  node,
  number,
  isConnecting,
  onConnectionStart,
  onConnectionEnd,
  onConditionAdd,
  onConditionClear,
  onConditionOpen,
  onNodeContextMenu,
  onNodeOpen,
  onNodeMove,
  onNodePointerDown
}: {
  node: WorkflowCanvasNode;
  number: number;
  isConnecting: boolean;
  onConnectionStart: (source: string, handle: HTMLButtonElement, branch?: WorkflowBranch) => void;
  onConnectionEnd: (target: string) => void;
  onConditionAdd: (nodeId: string) => void;
  onConditionClear: (nodeId: string, slotId: string) => void;
  onConditionOpen: (nodeId: string, slotId: string) => void;
  onNodeContextMenu: (nodeId: string, event: React.MouseEvent<HTMLElement>, conditionSlotId?: string) => void;
  onNodeOpen: (nodeId: string) => void;
  onNodeMove: (nodeId: string, deltaX: number, deltaY: number) => void;
  onNodePointerDown: (nodeId: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  const isTerminal = node.type === "approved" || node.type === "rejected";
  const conditionSlots = node.type === "condition" ? getConditionSlots(node) : [];
  const finishWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    const movement = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10]
    }[event.key];
    if (movement) {
      event.preventDefault();
      onNodeMove(node.id, movement[0], movement[1]);
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (isConnecting) onConnectionEnd(node.id);
    else if (node.type !== "condition") onNodeOpen(node.id);
  };
  const finishWithPointer = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onConnectionEnd(node.id);
  };

  const outputHandle = !isTerminal && node.type !== "condition" ? (
    <button
      aria-label={`Bắt đầu nối từ ${node.label}`}
      className="approval-workflow-node-handle is-output"
      data-workflow-output="default"
      type="button"
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        onConnectionStart(node.id, event.currentTarget);
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onConnectionStart(node.id, event.currentTarget);
      }}
    />
  ) : null;

  if (isTerminal) {
    return (
      <article
        aria-label={`Bước ${number}: ${node.label}; thả đường nối vào đây`}
        className={`approval-workflow-canvas-node approval-workflow-terminal-node is-${node.type}`}
        data-workflow-input="true"
        data-workflow-node-id={node.id}
        role="button"
        style={{ left: node.x, top: node.y }}
        tabIndex={0}
        onClick={() => onNodeOpen(node.id)}
        onContextMenu={(event) => onNodeContextMenu(node.id, event)}
        onKeyDown={finishWithKeyboard}
        onPointerDown={(event) => onNodePointerDown(node.id, event)}
        onPointerUp={finishWithPointer}
      >
        <span className="approval-workflow-terminal-icon"><WorkflowNodeTypeIcon type={node.type} size={36} /></span>
        <strong>{node.label}</strong>
      </article>
    );
  }

  return (
    <article
      aria-label={`Bước ${number}: ${node.label}; thả đường nối vào đây`}
      className={`approval-workflow-canvas-node approval-workflow-step-node is-${node.type}`}
      data-workflow-input="true"
      data-workflow-node-id={node.id}
      role="button"
      style={{ left: node.x, top: node.y }}
      tabIndex={0}
      onClick={() => {
        if (node.type !== "condition") onNodeOpen(node.id);
      }}
      onContextMenu={(event) => onNodeContextMenu(node.id, event)}
      onKeyDown={finishWithKeyboard}
      onPointerDown={(event) => onNodePointerDown(node.id, event)}
      onPointerUp={finishWithPointer}
    >
      {outputHandle}
      {node.type === "condition" ? (
        <button
          aria-label={`Bắt đầu nhánh không thỏa mãn từ ${node.label}`}
          className="approval-workflow-node-handle is-output is-condition-unmatched"
          data-workflow-output="unmatched"
          type="button"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onConnectionStart(node.id, event.currentTarget, "unmatched");
          }}
        />
      ) : null}
      <header>
        <span className="approval-workflow-canvas-node-icon"><WorkflowNodeTypeIcon type={node.type} size={24} /></span>
        <span><small>#{number}</small><strong>{node.label}</strong></span>
      </header>
      {node.type === "approval" ? <p><span aria-hidden="true">?</span> Chờ duyệt</p> : null}
      {conditionSlots.map((slot, slotIndex) => {
        const matchedBranch: WorkflowBranch = `matched:${slot.id}`;
        return (
          <p
            className={slot.config ? "is-configured" : undefined}
            key={slot.id}
            onContextMenu={(event) => onNodeContextMenu(node.id, event, slot.id)}
          >
            <button
              aria-label={slot.config ? `Mở cài đặt điều kiện ${slotIndex + 1}` : `Bấm để cài đặt điều kiện ${slotIndex + 1}`}
              className="approval-workflow-condition-configure"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onConditionOpen(node.id, slot.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >{slot.config ? `${slot.config.groups.length} nhóm điều kiện` : "Bấm để cài đặt"}</button>
            {slot.config || conditionSlots.length > 1 ? (
              <button
                aria-label={`Xóa điều kiện ${slotIndex + 1}`}
                className="approval-workflow-condition-clear"
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onConditionClear(node.id, slot.id);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              ><X size={16} /></button>
            ) : null}
            <button
              aria-label={`Bắt đầu nhánh thỏa mãn điều kiện ${slotIndex + 1}`}
              className="approval-workflow-node-handle is-output is-condition-slot"
              data-workflow-condition-output="true"
              data-workflow-condition-slot={slot.id}
              data-workflow-output={matchedBranch}
              type="button"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onConnectionStart(node.id, event.currentTarget, matchedBranch);
              }}
            />
          </p>
        );
      })}
      {node.type === "condition" ? (
        <button
          aria-label="Thêm điều kiện"
          className="approval-workflow-condition-add"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onConditionAdd(node.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        ><Plus size={16} /></button>
      ) : null}
    </article>
  );
}

function ApprovalWorkflowPicker({
  id,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
  value,
  groups,
  emptyMessage,
  onValueChange
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  groups: WorkflowPickerGroup[];
  emptyMessage?: string;
  onValueChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const options = groups.flatMap((group) => group.options);
  const selectedOption = options.find((option) => option.value === value);
  const labelId = `${id}-label`;
  const menuId = `${id}-menu`;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const focusRelativeOption = (current: HTMLButtonElement, direction: 1 | -1) => {
    const optionButtons = [...(pickerRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? [])];
    const nextIndex = Math.min(Math.max(optionButtons.indexOf(current) + direction, 0), optionButtons.length - 1);
    optionButtons[nextIndex]?.focus();
  };

  return (
    <div
      className={`approval-workflow-floating-field approval-workflow-flow-picker${value ? " has-value" : ""}${isOpen ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      ref={pickerRef}
    >
      <span id={labelId}>{label}{required ? <> <b aria-hidden="true">*</b></> : null}</span>
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        className="approval-workflow-flow-picker-trigger"
        disabled={disabled}
        role="combobox"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setIsOpen(false);
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => pickerRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus());
          }
        }}
      >
        {selectedOption?.label ?? (isOpen ? placeholder : "")}
      </button>
      {value ? (
        <button
          aria-label={`Xóa lựa chọn ${label}`}
          className="approval-workflow-flow-picker-clear"
          type="button"
          onClick={() => {
            onValueChange("");
            setIsOpen(false);
          }}
        >
          <X size={17} aria-hidden="true" />
        </button>
      ) : <CaretDown className="approval-workflow-flow-picker-caret" size={16} aria-hidden="true" />}
      {isOpen ? (
        <div className="approval-workflow-flow-picker-menu" id={menuId} role="listbox" aria-label={label}>
          {options.length > 0 ? groups.map((group, groupIndex) => (
            <section key={`${id}-group-${groupIndex}`}>
              {group.label ? <p>{group.label}</p> : null}
              {group.options.map((option) => (
                <button
                  aria-selected={option.value === value}
                  className={option.value === value ? "is-selected" : undefined}
                  key={option.value}
                  role="option"
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setIsOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIsOpen(false);
                      pickerRef.current?.querySelector<HTMLButtonElement>("[role='combobox']")?.focus();
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusRelativeOption(event.currentTarget, 1);
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusRelativeOption(event.currentTarget, -1);
                    }
                  }}
                >
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </button>
              ))}
            </section>
          )) : <span className="approval-workflow-flow-picker-empty">{emptyMessage ?? "Không có lựa chọn"}</span>}
        </div>
      ) : null}
    </div>
  );
}

type ApprovalAudienceOption = {
  value: string;
  label: string;
  meta: string;
  automatic?: boolean;
};

const approvalDynamicAudienceOptions: ApprovalAudienceOption[] = [
  { value: "dynamic:post_creator", label: "Người tạo", meta: "{field.post_id}" },
  { value: "dynamic:approval_user", label: "Người duyệt", meta: "{field.approval_by_id}" },
  { value: "dynamic:created_by", label: "Người tạo", meta: "{field.created_by_id}" },
  { value: "automatic:direct_manager", label: "Người quản lý trực tiếp của người tạo", meta: "Tự động chọn", automatic: true },
  { value: "automatic:creator_supervisor", label: "Giám sát của người tạo", meta: "Tự động chọn", automatic: true }
];

function ApprovalNodeAudiencePicker({
  id,
  label,
  required = false,
  value,
  employees,
  hasError = false,
  onValueChange
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  employees: EmployeeDirectoryRecord[];
  hasError?: boolean;
  onValueChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const userOptions = useMemo<ApprovalAudienceOption[]>(() => employees
    .filter((employee) => employee.status === "active")
    .map((employee) => ({
      value: employee.id,
      label: employee.fullName,
      meta: `${employee.code} · ${employee.department}`
    })), [employees]);
  const allOptions = [...approvalDynamicAudienceOptions, ...userOptions];
  const selectedOption = allOptions.find((option) => option.value === value);
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const matchesSearch = (option: ApprovalAudienceOption) => !normalizedSearch
    || `${option.label} ${option.meta}`.toLocaleLowerCase("vi").includes(normalizedSearch);
  const dynamicOptions = approvalDynamicAudienceOptions.filter(matchesSearch);
  const filteredUsers = userOptions.filter(matchesSearch);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const chooseOption = (option: ApprovalAudienceOption) => {
    onValueChange(option.value);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className={`approval-workflow-floating-field approval-node-audience-picker${value || isOpen ? " has-value" : ""}${isOpen ? " is-open" : ""}${hasError ? " has-error" : ""}`} ref={pickerRef}>
      <span id={`${id}-label`}>{label}{required ? <> <b aria-hidden="true">*</b></> : null}</span>
      <input
        aria-autocomplete="list"
        aria-controls={`${id}-menu`}
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        autoComplete="off"
        placeholder={isOpen ? "Chọn phòng ban, chức vụ, vị trí, người dùng" : ""}
        role="combobox"
        value={isOpen ? search : selectedOption?.label ?? ""}
        onChange={(event) => {
          setSearch(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          setIsOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setSearch("");
            setIsOpen(false);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            pickerRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus();
          }
        }}
      />
      <MagnifyingGlass size={19} aria-hidden="true" />
      {isOpen ? (
        <div className="approval-node-audience-menu" id={`${id}-menu`} role="listbox" aria-label={`Danh sách ${label.toLocaleLowerCase("vi")}`}>
          <header>
            <span>Danh sách người dùng</span>
            <span className="approval-node-audience-tools" aria-hidden="true">
              <Network size={18} />
              <BookmarkSimple size={18} />
              <WarningCircle size={16} />
            </span>
          </header>
          <div className="approval-node-audience-options">
            {dynamicOptions.length > 0 ? (
              <section aria-label="Cập nhật thông tin">
                <h5>Cập nhật thông tin</h5>
                {dynamicOptions.map((option) => (
                  <button
                    aria-selected={option.value === value}
                    className={`${option.value === value ? "is-selected" : ""}${option.automatic ? " is-automatic" : ""}`.trim() || undefined}
                    key={option.value}
                    role="option"
                    type="button"
                    onClick={() => chooseOption(option)}
                  >
                    {option.automatic ? <User size={18} aria-hidden="true" /> : <span aria-hidden="true" />}
                    <span><strong>{option.label}</strong><small>{option.meta}</small></span>
                  </button>
                ))}
              </section>
            ) : null}
            {filteredUsers.length > 0 ? (
              <section aria-label="Người dùng">
                <h5>Người dùng</h5>
                {filteredUsers.map((option) => (
                  <button
                    aria-selected={option.value === value}
                    className={option.value === value ? "is-selected" : undefined}
                    key={option.value}
                    role="option"
                    type="button"
                    onClick={() => chooseOption(option)}
                  >
                    <User size={18} aria-hidden="true" />
                    <span><strong>{option.label}</strong><small>{option.meta}</small></span>
                  </button>
                ))}
              </section>
            ) : null}
            {dynamicOptions.length === 0 && filteredUsers.length === 0 ? <p>Không tìm thấy kết quả</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkflowNodeContextMenu({
  state,
  onAddNode,
  onClose,
  onDelete,
  onDeleteIncomingEdges,
  onDuplicate,
  onSettings
}: {
  state: WorkflowNodeContextMenuState;
  onAddNode: (type: WorkflowNodeType) => void;
  onClose: () => void;
  onDelete: () => void;
  onDeleteIncomingEdges: () => void;
  onDuplicate: () => void;
  onSettings: () => void;
}) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [submenuLayout, setSubmenuLayout] = useState({ opensUp: false, maxHeight: 276 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const submenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnWindowChange = () => onClose();
    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("resize", closeOnWindowChange);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("resize", closeOnWindowChange);
    };
  }, [onClose]);

  const moveMenuFocus = (current: HTMLButtonElement, direction: 1 | -1) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not([disabled])") ?? [])];
    const currentIndex = items.indexOf(current);
    items[(currentIndex + direction + items.length) % items.length]?.focus();
  };

  const openSubmenu = () => {
    const triggerRect = submenuTriggerRef.current?.getBoundingClientRect();
    const viewportPadding = 8;
    const desiredHeight = workflowNodeOptions.length * 44 + 12;
    if (triggerRect) {
      const availableBelow = window.innerHeight - triggerRect.top - viewportPadding;
      const availableAbove = triggerRect.bottom - viewportPadding;
      const opensUp = availableBelow < desiredHeight && availableAbove > availableBelow;
      setSubmenuLayout({
        opensUp,
        maxHeight: Math.max(80, Math.min(desiredHeight, opensUp ? availableAbove : availableBelow))
      });
    }
    setIsSubmenuOpen(true);
  };

  return (
    <div
      className={`approval-node-context-menu${state.opensLeft ? " opens-left" : ""}`}
      ref={menuRef}
      role="menu"
      style={{ left: state.x, top: state.y }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <button role="menuitem" type="button" onClick={onSettings} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
        }
      }}>Cài đặt</button>
      <button role="menuitem" type="button" onClick={onDuplicate} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
        }
      }}>Nhân bản</button>
      <button className="is-danger" role="menuitem" type="button" onClick={onDelete} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
        }
      }}>Xóa</button>
      <button role="menuitem" type="button" onClick={onDeleteIncomingEdges} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveMenuFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
        }
      }}>Xóa liên kết đến bước</button>
      <div className="approval-node-context-submenu-shell" onPointerEnter={openSubmenu}>
        <button
          aria-expanded={isSubmenuOpen}
          aria-haspopup="menu"
          className="approval-node-context-submenu-trigger"
          ref={submenuTriggerRef}
          role="menuitem"
          type="button"
          onClick={openSubmenu}
          onFocus={openSubmenu}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openSubmenu();
              requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>(".approval-node-context-submenu [role='menuitem']")?.focus());
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              moveMenuFocus(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
            }
          }}
        >Thêm node <ArrowRight size={16} aria-hidden="true" /></button>
        {isSubmenuOpen ? (
          <div
            aria-label="Chọn loại node"
            className={`approval-node-context-submenu${submenuLayout.opensUp ? " opens-up" : ""}`}
            role="menu"
            style={{ maxHeight: submenuLayout.maxHeight }}
          >
            {workflowNodeOptions.map((option) => (
              <button key={option.value} role="menuitem" type="button" onClick={() => onAddNode(option.value)}>{option.label}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConditionNodeContextMenu({
  state,
  onAddNode,
  onClose,
  onDelete
}: {
  state: WorkflowNodeContextMenuState;
  onAddNode: (type: WorkflowNodeType, branch: ConditionBranchOutcome) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [activeBranch, setActiveBranch] = useState<ConditionBranchOutcome | null>(null);
  const [submenuLayout, setSubmenuLayout] = useState({ opensUp: false, maxHeight: 276 });
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeOnResize = () => onClose();
    document.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [onClose]);

  const openBranch = (branch: ConditionBranchOutcome, trigger: HTMLButtonElement) => {
    const triggerRect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const desiredHeight = workflowNodeOptions.length * 44 + 12;
    const availableBelow = window.innerHeight - triggerRect.top - viewportPadding;
    const availableAbove = triggerRect.bottom - viewportPadding;
    const opensUp = availableBelow < desiredHeight && availableAbove > availableBelow;
    setSubmenuLayout({
      opensUp,
      maxHeight: Math.max(80, Math.min(desiredHeight, opensUp ? availableAbove : availableBelow))
    });
    setActiveBranch(branch);
  };

  const branchItem = (branch: ConditionBranchOutcome, label: string) => (
    <div className="approval-node-context-submenu-shell" key={branch}>
      <button
        aria-expanded={activeBranch === branch}
        aria-haspopup="menu"
        className="approval-node-context-submenu-trigger"
        role="menuitem"
        type="button"
        onClick={(event) => openBranch(branch, event.currentTarget)}
        onFocus={(event) => openBranch(branch, event.currentTarget)}
        onPointerEnter={(event) => openBranch(branch, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openBranch(branch, event.currentTarget);
            requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>(".approval-node-context-submenu [role='menuitem']")?.focus());
          }
        }}
      >{label}<ArrowRight size={16} aria-hidden="true" /></button>
      {activeBranch === branch ? (
        <div
          aria-label={`Thêm node cho nhánh ${label.toLocaleLowerCase("vi")}`}
          className={`approval-node-context-submenu${submenuLayout.opensUp ? " opens-up" : ""}`}
          role="menu"
          style={{ maxHeight: submenuLayout.maxHeight }}
        >
          {workflowNodeOptions.map((option) => (
            <button key={option.value} role="menuitem" type="button" onClick={() => onAddNode(option.value, branch)}>{option.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`approval-node-context-menu condition-node-context-menu${state.opensLeft ? " opens-left" : ""}`}
      ref={menuRef}
      role="menu"
      style={{ left: state.x, top: state.y }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
    >
      <button className="is-danger" role="menuitem" type="button" onClick={onDelete}>Xóa</button>
      {state.conditionSlotId ? branchItem("matched", "Thỏa mãn") : null}
      {state.conditionSlotId ? branchItem("unmatched", "Không thỏa mãn") : null}
    </div>
  );
}

function ConditionInlinePicker({
  id,
  ariaLabel,
  value,
  placeholder,
  options,
  compact = false,
  onValueChange
}: {
  id: string;
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: WorkflowPickerOption[];
  compact?: boolean;
  onValueChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const menuId = `${id}-menu`;

  const updateMenuLayout = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const desiredHeight = Math.min(320, options.reduce((height, option) => height + (option.description ? 68 : 44), 12));
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const availableAbove = rect.top - viewportPadding;
    const opensUp = availableBelow < Math.min(desiredHeight, 160) && availableAbove > availableBelow;
    const maxHeight = Math.max(88, Math.min(desiredHeight, opensUp ? availableAbove : availableBelow));
    const width = Math.min(Math.max(rect.width, compact ? 220 : 240), window.innerWidth - viewportPadding * 2);
    const left = Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - width - viewportPadding);

    setMenuLayout({
      left,
      top: opensUp ? Math.max(viewportPadding, rect.top - maxHeight) : rect.bottom,
      width,
      maxHeight
    });
  }, [compact, options]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuLayout();
    const closeOnViewportChange = () => setIsOpen(false);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [isOpen, updateMenuLayout]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    return () => document.removeEventListener("pointerdown", closeOnPointerDown);
  }, [isOpen]);

  const menu = isOpen ? createPortal(
    <div
      aria-label={ariaLabel}
      className={`condition-node-picker-menu${compact ? " is-function" : ""}`}
      id={menuId}
      ref={menuRef}
      role="listbox"
      style={menuLayout}
    >
      {options.map((option) => (
        <button
          aria-selected={option.value === value}
          className={option.value === value ? "is-selected" : undefined}
          key={option.value}
          role="option"
          type="button"
          onClick={() => {
            onValueChange(option.value);
            setIsOpen(false);
          }}
        >
          <strong>{option.label}</strong>
          {option.description ? <small>{option.description}</small> : null}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`condition-node-inline-picker${compact ? " is-kind" : ""}${isOpen ? " is-open" : ""}`}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="condition-node-inline-picker-trigger"
        ref={triggerRef}
        role="combobox"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus());
          }
        }}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <CaretDown size={16} aria-hidden="true" />
      </button>
      {menu}
    </div>
  );
}

function ConditionNodeSettingsModal({
  defaultName,
  node,
  onCancel,
  onSave
}: {
  defaultName: string;
  node: WorkflowCanvasNode;
  onCancel: () => void;
  onSave: (config: ConditionNodeConfig) => void;
}) {
  const [draft, setDraft] = useState<ConditionNodeConfig>(() => node.conditionConfig ?? createEmptyConditionConfig(defaultName));
  const [showValidation, setShowValidation] = useState(false);
  const itemSequenceRef = useRef(1);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const nextId = (prefix: string) => {
    itemSequenceRef.current += 1;
    return `${prefix}-${itemSequenceRef.current}`;
  };
  const updateClause = (groupId: string, clauseId: string, patch: Partial<ConditionClause>) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => group.id === groupId ? {
        ...group,
        clauses: group.clauses.map((clause) => clause.id === clauseId ? { ...clause, ...patch } : clause)
      } : group)
    }));
  };
  const removeClause = (groupId: string, clauseId: string) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.map((group) => group.id === groupId ? {
        ...group,
        clauses: group.clauses.length === 1
          ? [createEmptyConditionClause(nextId("clause"))]
          : group.clauses.filter((clause) => clause.id !== clauseId)
      } : group)
    }));
  };
  const removeGroup = (groupId: string) => {
    setDraft((current) => ({
      ...current,
      groups: current.groups.length === 1
        ? [{ id: nextId("group"), clauses: [createEmptyConditionClause(nextId("clause"))] }]
        : current.groups.filter((group) => group.id !== groupId)
    }));
  };
  const isComplete = draft.name.trim() && draft.groups.every((group) => group.clauses.every((clause) =>
    clause.field && clause.operator && clause.rightValue
  ));

  return (
    <div
      className="approval-node-modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section aria-labelledby="condition-node-modal-title" aria-modal="true" className="approval-node-modal condition-node-modal" role="dialog">
        <header>
          <h3 id="condition-node-modal-title">Điều kiện</h3>
          <button aria-label="Đóng" type="button" onClick={onCancel}><X size={24} /></button>
        </header>
        <div className="approval-node-modal-body condition-node-modal-body">
          <label className={`approval-workflow-floating-field has-value${showValidation && !draft.name.trim() ? " has-error" : ""}`}>
            <span>Tên điều kiện <b aria-hidden="true">*</b></span>
            <input autoComplete="off" autoFocus placeholder="" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>

          <div className="condition-node-groups">
            {draft.groups.map((group) => (
              <section className="condition-node-group" key={group.id}>
                <header>
                  <em>Đồng thời thỏa mãn các điều kiện sau</em>
                  <button aria-label="Xóa nhóm điều kiện" type="button" onClick={() => removeGroup(group.id)}><X size={20} /></button>
                </header>
                <div className="condition-node-clauses">
                  {group.clauses.map((clause) => {
                    const invalid = showValidation && (!clause.field || !clause.operator || !clause.rightValue);
                    return (
                      <div className={`condition-node-clause${invalid ? " has-error" : ""}`} key={clause.id}>
                        <ConditionInlinePicker
                          ariaLabel="Hàm xử lý vế trái"
                          compact
                          id={`${group.id}-${clause.id}-left-function`}
                          options={conditionFunctionOptions}
                          placeholder="F"
                          value={clause.leftFunction ?? ""}
                          onValueChange={(value) => updateClause(group.id, clause.id, { leftFunction: value as ConditionFunction })}
                        />
                        <ConditionInlinePicker
                          ariaLabel="Trường dữ liệu"
                          id={`${group.id}-${clause.id}-field`}
                          options={[...conditionFieldOptions]}
                          placeholder="Chọn trường"
                          value={clause.field}
                          onValueChange={(value) => updateClause(group.id, clause.id, { field: value })}
                        />
                        <label className="condition-node-select"><span className="sr-only">Phép so sánh</span><select aria-label="Phép so sánh" value={clause.operator} onChange={(event) => updateClause(group.id, clause.id, { operator: event.target.value as ConditionOperator })}><option value="">So sánh</option>{conditionOperatorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDown size={16} /></label>
                        <label className="condition-node-select is-kind"><span className="sr-only">Loại vế phải</span><select aria-label="Loại vế phải" value={clause.rightType} onChange={(event) => updateClause(group.id, clause.id, { rightType: event.target.value as ConditionOperandType, rightValue: "" })}><option value="field">F</option><option value="value">V</option></select><CaretDown size={16} /></label>
                        {clause.rightType === "field" ? (
                          <label className="condition-node-select"><span className="sr-only">Trường so sánh</span><select aria-label="Trường so sánh" value={clause.rightValue} onChange={(event) => updateClause(group.id, clause.id, { rightValue: event.target.value })}><option value="">Trường, giá trị...</option>{conditionFieldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><CaretDown size={16} /></label>
                        ) : (
                          <label className="condition-node-value"><span className="sr-only">Giá trị so sánh</span><input aria-label="Giá trị so sánh" placeholder="Nhập giá trị" value={clause.rightValue} onChange={(event) => updateClause(group.id, clause.id, { rightValue: event.target.value })} /></label>
                        )}
                        <button aria-label="Xóa điều kiện" className="condition-node-remove" type="button" onClick={() => removeClause(group.id, clause.id)}><X size={18} /></button>
                      </div>
                    );
                  })}
                </div>
                <button aria-label="Thêm điều kiện" className="condition-node-add" type="button" onClick={() => setDraft((current) => ({
                  ...current,
                  groups: current.groups.map((item) => item.id === group.id ? {
                    ...item,
                    clauses: [...item.clauses, createEmptyConditionClause(nextId("clause"))]
                  } : item)
                }))}><Plus size={17} /></button>
              </section>
            ))}
          </div>
          <button aria-label="Thêm nhóm điều kiện" className="condition-node-add" type="button" onClick={() => setDraft((current) => ({
            ...current,
            groups: [...current.groups, { id: nextId("group"), clauses: [createEmptyConditionClause(nextId("clause"))] }]
          }))}><Plus size={17} /></button>
        </div>
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>HỦY BỎ</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              if (!isComplete) {
                setShowValidation(true);
                return;
              }
              onSave({ ...draft, name: draft.name.trim() });
            }}
          >CẬP NHẬT</button>
        </footer>
      </section>
    </div>
  );
}

function ApprovalNodeSettingsModal({
  node,
  employees,
  onCancel,
  onSave
}: {
  node: WorkflowCanvasNode;
  employees: EmployeeDirectoryRecord[];
  onCancel: () => void;
  onSave: (config: ApprovalNodeConfig) => void;
}) {
  const [draft, setDraft] = useState<ApprovalNodeConfig>(() => node.approvalConfig ?? createEmptyApprovalNodeConfig());
  const [showValidation, setShowValidation] = useState(false);
  const setField = <K extends keyof ApprovalNodeConfig>(field: K, value: ApprovalNodeConfig[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  const audienceField = (
    field: "approverId" | "followerId" | "substituteId",
    label: string,
    required = false
  ) => (
    <ApprovalNodeAudiencePicker
      employees={employees}
      hasError={showValidation && required && !draft[field]}
      id={`approval-node-${field}`}
      label={label}
      required={required}
      value={draft[field]}
      onValueChange={(nextValue) => setField(field, nextValue)}
    />
  );

  return (
    <div
      className="approval-node-modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section aria-labelledby="approval-node-modal-title" aria-modal="true" className="approval-node-modal" role="dialog">
        <header>
          <h3 id="approval-node-modal-title">Bước duyệt</h3>
          <button aria-label="Đóng" type="button" onClick={onCancel}><X size={24} /></button>
        </header>
        <div className="approval-node-modal-body">
          <section className="approval-node-modal-section">
            <h4><CaretDown size={17} aria-hidden="true" /> Thông tin chung</h4>
            <div className="approval-node-name-grid">
              <label className={`approval-workflow-floating-field${draft.name ? " has-value" : ""}${showValidation && !draft.name.trim() ? " has-error" : ""}`}>
                <span>Tên bước duyệt <b aria-hidden="true">*</b></span>
                <input autoComplete="off" autoFocus placeholder="" value={draft.name} onChange={(event) => setField("name", event.target.value)} />
              </label>
              <label className={`approval-workflow-floating-field${draft.code ? " has-value" : ""}`}>
                <span>Mã bước duyệt</span>
                <input autoComplete="off" placeholder="" value={draft.code} onChange={(event) => setField("code", event.target.value)} />
              </label>
            </div>
            {audienceField("approverId", "Người duyệt", true)}
            {audienceField("followerId", "Người theo dõi")}
            {audienceField("substituteId", "Người duyệt thay thế")}
          </section>

          <section className="approval-node-modal-section">
            <h4><CaretDown size={17} aria-hidden="true" /> Cài đặt khi bước duyệt quá hạn</h4>
            <div className="approval-node-deadline-grid">
              <label><span>Ngày</span><input aria-label="Ngày" autoComplete="off" inputMode="numeric" min="0" type="number" value={draft.deadlineDays} onChange={(event) => setField("deadlineDays", event.target.value)} /></label>
              <label><span>Giờ</span><input aria-label="Giờ" autoComplete="off" inputMode="numeric" max="23" min="0" type="number" value={draft.deadlineHours} onChange={(event) => setField("deadlineHours", event.target.value)} /></label>
              <label><span>Phút</span><input aria-label="Phút" autoComplete="off" inputMode="numeric" max="59" min="0" type="number" value={draft.deadlineMinutes} onChange={(event) => setField("deadlineMinutes", event.target.value)} /></label>
            </div>
            <fieldset className="approval-node-overdue-options">
              <legend>Khi bước duyệt quá thời hạn</legend>
              <label><input checked={draft.overdueAction === "auto_approve"} name={`approval-overdue-${node.id}`} type="radio" onChange={() => setField("overdueAction", "auto_approve")} /> Hệ thống tự động duyệt và chuyển sang bước tiếp theo</label>
              <label><input checked={draft.overdueAction === "auto_reject"} name={`approval-overdue-${node.id}`} type="radio" onChange={() => setField("overdueAction", "auto_reject")} /> Hệ thống tự động không duyệt</label>
              <label><input checked={draft.overdueAction === "substitute"} name={`approval-overdue-${node.id}`} type="radio" onChange={() => setField("overdueAction", "substitute")} /> Chuyển cho người duyệt thay thế</label>
              <label><input checked={draft.overdueAction === "none"} name={`approval-overdue-${node.id}`} type="radio" onChange={() => setField("overdueAction", "none")} /> Không áp dụng xử lý</label>
            </fieldset>
            <button className="secondary-button approval-node-reset-button" type="button" onClick={() => setDraft(createEmptyApprovalNodeConfig())}>TRỞ VỀ MẶC ĐỊNH</button>
          </section>
        </div>
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel}>HỦY BỎ</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              if (!draft.name.trim() || !draft.approverId) {
                setShowValidation(true);
                return;
              }
              onSave({ ...draft, name: draft.name.trim(), code: draft.code.trim() });
            }}
          >CẬP NHẬT</button>
        </footer>
      </section>
    </div>
  );
}

export function ApprovalWorkflowCreateBoard({ employees }: { employees: EmployeeDirectoryRecord[] }) {
  const [activeTab, setActiveTab] = useState<"general" | "flow">("general");
  const [displayStatus, setDisplayStatus] = useState("");
  const [followerId, setFollowerId] = useState("");
  const [followerSearch, setFollowerSearch] = useState("");
  const [isFollowerOpen, setIsFollowerOpen] = useState(false);
  const [objectType, setObjectType] = useState("");
  const [subObject, setSubObject] = useState("");
  const [approvalType, setApprovalType] = useState("");
  const [isNodePaletteOpen, setIsNodePaletteOpen] = useState(false);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowCanvasNode[]>([]);
  const [workflowEdges, setWorkflowEdges] = useState<WorkflowCanvasEdge[]>([]);
  const [workflowEdgePaths, setWorkflowEdgePaths] = useState<WorkflowEdgePath[]>([]);
  const [workflowEdgeStyle, setWorkflowEdgeStyle] = useState<WorkflowEdgeStyle>("curved");
  const [connectionDraft, setConnectionDraft] = useState<WorkflowConnectionDraft | null>(null);
  const [startNodePosition, setStartNodePosition] = useState({ x: 60, y: 172 });
  const [nodeDrag, setNodeDrag] = useState<WorkflowNodeDrag | null>(null);
  const [editingApprovalNodeId, setEditingApprovalNodeId] = useState<string | null>(null);
  const [editingConditionSlot, setEditingConditionSlot] = useState<{ nodeId: string; slotId: string } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<WorkflowNodeContextMenuState | null>(null);
  const followerPickerRef = useRef<HTMLDivElement | null>(null);
  const nodePaletteRef = useRef<HTMLDivElement | null>(null);
  const workflowCanvasRef = useRef<HTMLDivElement | null>(null);
  const workflowCanvasLaneRef = useRef<HTMLDivElement | null>(null);
  const nodeSequenceRef = useRef(0);
  const edgeSequenceRef = useRef(0);
  const conditionSlotSequenceRef = useRef(0);
  const suppressNodeClickRef = useRef(false);
  const [state, formAction, isPending] = useActionState(createApprovalWorkflowAction, initialState);
  const activeEmployees = useMemo(
    () => employees.filter((item) => item.status === "active"),
    [employees]
  );
  const selectedFollower = useMemo(
    () => activeEmployees.find((item) => item.id === followerId),
    [activeEmployees, followerId]
  );
  const filteredFollowers = useMemo(() => {
    const search = followerSearch.trim().toLocaleLowerCase("vi");
    if (!search) return activeEmployees;

    return activeEmployees.filter((item) =>
      `${item.fullName} ${item.code} ${item.department}`.toLocaleLowerCase("vi").includes(search)
    );
  }, [activeEmployees, followerSearch]);
  const flowDefinition = useMemo(() => ({
    nodes: [
      { id: "start", type: "start", label: "Bắt đầu", x: startNodePosition.x, y: startNodePosition.y },
      ...workflowNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        x: node.x,
        y: node.y,
        ...(node.approvalConfig ? { config: node.approvalConfig } : {}),
        ...(node.type === "condition" ? {
          conditions: getConditionSlots(node).map((slot) => ({ id: slot.id, config: slot.config ?? null }))
        } : {})
      }))
    ],
    edges: workflowEdges,
    edgeStyle: workflowEdgeStyle
  }), [startNodePosition, workflowEdgeStyle, workflowEdges, workflowNodes]);
  const connectionDraftPath = useMemo(() => {
    if (!connectionDraft) return "";
    return workflowEdgeStyle === "straight"
      ? buildStraightWorkflowPath(connectionDraft.startX, connectionDraft.startY, connectionDraft.currentX, connectionDraft.currentY)
      : buildCurvedWorkflowPath(connectionDraft.startX, connectionDraft.startY, connectionDraft.currentX, connectionDraft.currentY);
  }, [connectionDraft, workflowEdgeStyle]);

  const updateWorkflowEdgePaths = useCallback(() => {
    const lane = workflowCanvasLaneRef.current;
    if (!lane) return;

    const laneRect = lane.getBoundingClientRect();
    setWorkflowEdgePaths(workflowEdges.flatMap((edge) => {
      const branchSlotId = getWorkflowBranchSlotId(edge.branch);
      const isConditionBranch = isUnmatchedWorkflowBranch(edge.branch) || isMatchedWorkflowBranch(edge.branch);
      const sourceSelector = branchSlotId
        ? `[data-workflow-condition-slot="${branchSlotId}"]`
        : edge.branch === "matched"
          ? "[data-workflow-condition-output]"
          : `[data-workflow-output="${edge.branch ?? "default"}"]`;
      const sourceHandle = lane.querySelector<HTMLElement>(`[data-workflow-node-id="${edge.source}"] ${sourceSelector}`);
      const targetNode = lane.querySelector<HTMLElement>(`[data-workflow-node-id="${edge.target}"][data-workflow-input]`);
      if (!sourceHandle || !targetNode) return [];

      const sourceRect = sourceHandle.getBoundingClientRect();
      const targetRect = targetNode.getBoundingClientRect();
      const startX = sourceRect.left + sourceRect.width / 2 - laneRect.left;
      const startY = sourceRect.top + sourceRect.height / 2 - laneRect.top;
      const endX = targetRect.left - laneRect.left;
      const endY = targetRect.top + targetRect.height / 2 - laneRect.top;

      const labelAnchorX = startX + Math.min(120, Math.max(88, endX - startX) / 2);

      return [{
        ...edge,
        ...(isConditionBranch ? {
          labelX: labelAnchorX - 8,
          labelY: startY + (endY - startY) / 2
        } : {}),
        path: workflowEdgeStyle === "straight"
          ? buildStraightWorkflowPath(startX, startY, endX, endY)
          : buildCurvedWorkflowPath(startX, startY, endX, endY)
      }];
    }));
  }, [workflowEdgeStyle, workflowEdges]);

  useLayoutEffect(() => {
    updateWorkflowEdgePaths();
    const lane = workflowCanvasLaneRef.current;
    if (!lane) return;

    const observer = new ResizeObserver(updateWorkflowEdgePaths);
    observer.observe(lane);
    return () => observer.disconnect();
  }, [startNodePosition, updateWorkflowEdgePaths, workflowNodes]);

  useEffect(() => {
    if (state.ok) window.location.assign("/admin/settings/approval-workflows");
  }, [state.ok]);

  useEffect(() => {
    if (!isFollowerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!followerPickerRef.current?.contains(event.target as Node)) {
        setFollowerSearch("");
        setIsFollowerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isFollowerOpen]);

  useEffect(() => {
    if (!isNodePaletteOpen) return;

    const closeNodePalette = (event: PointerEvent) => {
      if (!nodePaletteRef.current?.contains(event.target as Node)) setIsNodePaletteOpen(false);
    };
    const handleNodePaletteKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsNodePaletteOpen(false);
      nodePaletteRef.current?.querySelector<HTMLButtonElement>("[aria-label='Thêm bước']")?.focus();
    };

    document.addEventListener("pointerdown", closeNodePalette);
    document.addEventListener("keydown", handleNodePaletteKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeNodePalette);
      document.removeEventListener("keydown", handleNodePaletteKeyDown);
    };
  }, [isNodePaletteOpen]);

  useEffect(() => {
    if (!connectionDraft) return;

    const handlePointerMove = (event: PointerEvent) => {
      const laneRect = workflowCanvasLaneRef.current?.getBoundingClientRect();
      if (!laneRect) return;

      setConnectionDraft((current) => current ? {
        ...current,
        currentX: event.clientX - laneRect.left,
        currentY: event.clientY - laneRect.top
      } : null);
    };
    const handlePointerUp = () => setConnectionDraft(null);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [connectionDraft?.source]);

  useEffect(() => {
    if (!nodeDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (Math.abs(event.clientX - nodeDrag.startClientX) > 4 || Math.abs(event.clientY - nodeDrag.startClientY) > 4) {
        suppressNodeClickRef.current = true;
      }
      const x = Math.min(Math.max(nodeDrag.originX + event.clientX - nodeDrag.startClientX, 12), nodeDrag.maxX);
      const y = Math.min(Math.max(nodeDrag.originY + event.clientY - nodeDrag.startClientY, 12), nodeDrag.maxY);

      if (nodeDrag.nodeId === "start") {
        setStartNodePosition({ x, y });
        return;
      }
      setWorkflowNodes((current) => current.map((node) => node.id === nodeDrag.nodeId ? { ...node, x, y } : node));
    };
    const handlePointerUp = () => {
      setNodeDrag(null);
      window.setTimeout(() => { suppressNodeClickRef.current = false; }, 0);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [nodeDrag]);

  const closeFollowerPicker = () => {
    setFollowerSearch("");
    setIsFollowerOpen(false);
  };

  const selectFollower = (employee: EmployeeDirectoryRecord) => {
    setFollowerId(employee.id);
    closeFollowerPicker();
  };

  const addWorkflowNode = (type: WorkflowNodeType, position?: { x: number; y: number }) => {
    const option = workflowNodeOptions.find((item) => item.value === type);
    if (!option) return null;

    nodeSequenceRef.current += 1;
    const nodeId = `${type}-${nodeSequenceRef.current}`;
    setWorkflowNodes((current) => {
      const index = current.length;
      return [
        ...current,
        {
          id: nodeId,
          type,
          label: option.label,
          x: position?.x ?? 300 + (index % 4) * 240,
          y: position?.y ?? 72 + Math.floor(index / 4) * 160
        }
      ];
    });
    setIsNodePaletteOpen(false);
    return nodeId;
  };

  const moveWorkflowNode = (nodeId: string, deltaX: number, deltaY: number) => {
    const lane = workflowCanvasLaneRef.current;
    const nodeElement = lane?.querySelector<HTMLElement>(`[data-workflow-node-id="${nodeId}"]`);
    if (!lane || !nodeElement) return;

    const clampPosition = (x: number, y: number) => ({
      x: Math.min(Math.max(x, 12), lane.clientWidth - nodeElement.offsetWidth - 12),
      y: Math.min(Math.max(y, 12), lane.clientHeight - nodeElement.offsetHeight - 12)
    });
    if (nodeId === "start") {
      setStartNodePosition((current) => clampPosition(current.x + deltaX, current.y + deltaY));
      return;
    }
    setWorkflowNodes((current) => current.map((node) => node.id === nodeId
      ? { ...node, ...clampPosition(node.x + deltaX, node.y + deltaY) }
      : node));
  };

  const startNodeDrag = (nodeId: string, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-workflow-output]")) return;
    const lane = workflowCanvasLaneRef.current;
    const nodeElement = event.currentTarget;
    if (!lane) return;

    const node = nodeId === "start" ? startNodePosition : workflowNodes.find((item) => item.id === nodeId);
    if (!node) return;

    event.preventDefault();
    suppressNodeClickRef.current = false;
    setNodeDrag({
      nodeId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: node.x,
      originY: node.y,
      maxX: lane.clientWidth - nodeElement.offsetWidth - 12,
      maxY: lane.clientHeight - nodeElement.offsetHeight - 12
    });
  };

  const startWorkflowConnection = (source: string, handle: HTMLButtonElement, branch: WorkflowBranch = "default") => {
    const laneRect = workflowCanvasLaneRef.current?.getBoundingClientRect();
    if (!laneRect) return;

    const handleRect = handle.getBoundingClientRect();
    const startX = handleRect.left + handleRect.width / 2 - laneRect.left;
    const startY = handleRect.top + handleRect.height / 2 - laneRect.top;
    setConnectionDraft({ source, branch, startX, startY, currentX: startX, currentY: startY });
  };

  const finishWorkflowConnection = (target: string) => {
    if (!connectionDraft || connectionDraft.source === target || target === "start") return;
    if (workflowEdges.some((edge) => edge.source === connectionDraft.source && edge.target === target)) {
      setConnectionDraft(null);
      return;
    }

    edgeSequenceRef.current += 1;
    const edgeId = `edge-${edgeSequenceRef.current}`;
    setWorkflowEdges((current) => [
      ...current.filter((edge) => connectionDraft.branch === "default"
        || edge.source !== connectionDraft.source
        || edge.branch !== connectionDraft.branch),
      {
      id: edgeId,
      source: connectionDraft.source,
      target,
      branch: connectionDraft.branch
      }
    ]);
    setConnectionDraft(null);
  };

  const removeWorkflowEdge = (edgeId: string) => {
    setWorkflowEdges((current) => current.filter((edge) => edge.id !== edgeId));
  };

  const openWorkflowNode = (nodeId: string) => {
    if (suppressNodeClickRef.current) {
      suppressNodeClickRef.current = false;
      return;
    }
    const node = workflowNodes.find((item) => item.id === nodeId);
    if (node?.type === "approval") setEditingApprovalNodeId(nodeId);
  };

  const openConditionSlot = (nodeId: string, slotId: string) => {
    if (suppressNodeClickRef.current) {
      suppressNodeClickRef.current = false;
      return;
    }
    setEditingConditionSlot({ nodeId, slotId });
  };

  const openWorkflowNodeContextMenu = (nodeId: string, event: React.MouseEvent<HTMLElement>, conditionSlotId?: string) => {
    const node = workflowNodes.find((item) => item.id === nodeId);
    if (node?.type !== "approval" && node?.type !== "condition") return;

    event.preventDefault();
    event.stopPropagation();
    const viewportPadding = 8;
    const menuWidth = 264;
    const submenuWidth = 224;
    const menuHeight = 304;
    setNodeContextMenu({
      nodeId,
      ...(conditionSlotId ? { conditionSlotId } : {}),
      x: Math.min(Math.max(event.clientX, viewportPadding), Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)),
      y: Math.min(Math.max(event.clientY, viewportPadding), Math.max(viewportPadding, window.innerHeight - menuHeight - viewportPadding)),
      opensLeft: event.clientX + menuWidth + submenuWidth + viewportPadding > window.innerWidth
    });
  };

  const duplicateContextNode = () => {
    if (!nodeContextMenu) return;
    const sourceNode = workflowNodes.find((node) => node.id === nodeContextMenu.nodeId);
    if (!sourceNode) return;

    nodeSequenceRef.current += 1;
    const lane = workflowCanvasLaneRef.current;
    const nextX = Math.min(sourceNode.x + 32, Math.max(12, (lane?.clientWidth ?? sourceNode.x + 260) - 232));
    const nextY = Math.min(sourceNode.y + 32, Math.max(12, (lane?.clientHeight ?? sourceNode.y + 160) - 132));
    setWorkflowNodes((current) => [...current, {
      ...sourceNode,
      id: `${sourceNode.type}-${nodeSequenceRef.current}`,
      x: nextX,
      y: nextY,
      ...(sourceNode.approvalConfig ? { approvalConfig: { ...sourceNode.approvalConfig } } : {})
    }]);
    setNodeContextMenu(null);
  };

  const deleteContextNode = () => {
    if (!nodeContextMenu) return;
    const nodeId = nodeContextMenu.nodeId;
    setWorkflowNodes((current) => current.filter((node) => node.id !== nodeId));
    setWorkflowEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setEditingApprovalNodeId((current) => current === nodeId ? null : current);
    setEditingConditionSlot((current) => current?.nodeId === nodeId ? null : current);
    setNodeContextMenu(null);
  };

  const deleteContextNodeIncomingEdges = () => {
    if (!nodeContextMenu) return;
    setWorkflowEdges((current) => current.filter((edge) => edge.target !== nodeContextMenu.nodeId));
    setNodeContextMenu(null);
  };

  const addNodeFromContextMenu = (type: WorkflowNodeType) => {
    if (!nodeContextMenu) return;
    const sourceNode = workflowNodes.find((node) => node.id === nodeContextMenu.nodeId);
    const lane = workflowCanvasLaneRef.current;
    addWorkflowNode(type, sourceNode ? {
      x: Math.min(sourceNode.x + 240, Math.max(12, (lane?.clientWidth ?? sourceNode.x + 480) - 232)),
      y: sourceNode.y
    } : undefined);
    setNodeContextMenu(null);
  };

  const addNodeFromConditionBranch = (type: WorkflowNodeType, outcome: ConditionBranchOutcome) => {
    if (!nodeContextMenu) return;
    const sourceNode = workflowNodes.find((node) => node.id === nodeContextMenu.nodeId);
    if (!sourceNode || sourceNode.type !== "condition") return;

    const branch: WorkflowBranch = nodeContextMenu.conditionSlotId
      ? `${outcome}:${nodeContextMenu.conditionSlotId}`
      : outcome;
    const lane = workflowCanvasLaneRef.current;
    const position = outcome === "matched"
      ? {
          x: Math.min(sourceNode.x + 320, Math.max(12, (lane?.clientWidth ?? sourceNode.x + 560) - 232)),
          y: Math.max(12, sourceNode.y - 90)
        }
      : {
          x: Math.min(sourceNode.x + 320, Math.max(12, (lane?.clientWidth ?? sourceNode.x + 560) - 232)),
          y: Math.min(sourceNode.y + 190, Math.max(12, (lane?.clientHeight ?? sourceNode.y + 350) - 132))
        };
    const targetId = addWorkflowNode(type, position);
    if (!targetId) return;

    edgeSequenceRef.current += 1;
    setWorkflowEdges((current) => [
      ...current.filter((edge) => edge.source !== sourceNode.id || edge.branch !== branch),
      { id: `edge-${edgeSequenceRef.current}`, source: sourceNode.id, target: targetId, branch }
    ]);
    setNodeContextMenu(null);
  };

  const saveApprovalNodeConfig = (config: ApprovalNodeConfig) => {
    setWorkflowNodes((current) => current.map((node) => node.id === editingApprovalNodeId
      ? { ...node, label: config.name, approvalConfig: config }
      : node));
    setEditingApprovalNodeId(null);
  };

  const addConditionSlot = (nodeId: string) => {
    conditionSlotSequenceRef.current += 1;
    setWorkflowNodes((current) => current.map((node) => node.id === nodeId
      ? {
          ...node,
          conditionConfig: undefined,
          conditionSlots: [
            ...getConditionSlots(node),
            { id: `${nodeId}:condition-${conditionSlotSequenceRef.current + 1}` }
          ]
        }
      : node));
  };

  const clearConditionSlot = (nodeId: string, slotId: string) => {
    const currentNode = workflowNodes.find((node) => node.id === nodeId);
    if (!currentNode) return;
    const currentSlots = getConditionSlots(currentNode);
    const slotIndex = currentSlots.findIndex((slot) => slot.id === slotId);
    const removedBranches: WorkflowBranch[] = [
      `matched:${slotId}`,
      `unmatched:${slotId}`,
      ...(slotIndex === 0 ? ["matched" as const] : [])
    ];
    setWorkflowNodes((current) => current.map((node) => {
      if (node.id !== nodeId) return node;
      const slots = getConditionSlots(node);
      if (slots.length === 1) {
        return { ...node, conditionConfig: undefined, conditionSlots: [{ ...slots[0], config: undefined }] };
      }
      return {
        ...node,
        conditionConfig: undefined,
        conditionSlots: slots.filter((slot) => slot.id !== slotId)
      };
    }));
    setWorkflowEdges((current) => current.filter((edge) => edge.source !== nodeId || !removedBranches.includes(edge.branch ?? "default")));
    setEditingConditionSlot((current) => current?.nodeId === nodeId && current.slotId === slotId ? null : current);
  };

  const saveConditionNodeConfig = (config: ConditionNodeConfig) => {
    if (!editingConditionSlot) return;
    setWorkflowNodes((current) => current.map((node) => {
      if (node.id !== editingConditionSlot.nodeId) return node;
      return {
        ...node,
        conditionConfig: undefined,
        conditionSlots: getConditionSlots(node).map((slot) => slot.id === editingConditionSlot.slotId
          ? { ...slot, config }
          : slot)
      };
    }));
    setEditingConditionSlot(null);
  };

  const editingApprovalNode = workflowNodes.find((node) => node.id === editingApprovalNodeId);
  const editingConditionNode = workflowNodes.find((node) => node.id === editingConditionSlot?.nodeId);
  const editingConditionSlots = editingConditionNode?.type === "condition" ? getConditionSlots(editingConditionNode) : [];
  const editingConditionSlotIndex = editingConditionSlots.findIndex((slot) => slot.id === editingConditionSlot?.slotId);
  const editingConditionConfig = editingConditionSlotIndex >= 0 ? editingConditionSlots[editingConditionSlotIndex]?.config : undefined;
  const contextMenuNode = workflowNodes.find((node) => node.id === nodeContextMenu?.nodeId);

  return (
    <section className="approval-workflow-create-card" aria-labelledby="approval-workflow-create-title">
      <h2 className="sr-only" id="approval-workflow-create-title">Tạo mới quy trình duyệt</h2>
      <form action={formAction} className="approval-workflow-form">
        <div className="approval-workflow-form-tabs" role="tablist" aria-label="Các bước cấu hình quy trình">
          <button className={activeTab === "general" ? "is-active" : undefined} type="button" role="tab" aria-selected={activeTab === "general"} onClick={() => setActiveTab("general")}>Thông tin chung</button>
          <button className={activeTab === "flow" ? "is-active" : undefined} type="button" role="tab" aria-selected={activeTab === "flow"} onClick={() => setActiveTab("flow")}>Cài đặt quy trình</button>
        </div>

        <div className={activeTab === "general" ? "approval-workflow-form-panel is-active" : "approval-workflow-form-panel"} role="tabpanel">
          <h3><CaretDown size={17} aria-hidden="true" /> Thông tin chung</h3>
          <div className="approval-workflow-field-grid">
            <label className="approval-workflow-floating-field"><span>Mã quy trình</span><input name="code" placeholder="Mã quy trình" /></label>
            <label className={`approval-workflow-floating-field approval-workflow-select${displayStatus ? " has-value" : ""}`}><span>Trạng thái <b aria-hidden="true">*</b></span><select name="displayStatus" required value={displayStatus} onChange={(event) => setDisplayStatus(event.target.value)}><option value="" disabled hidden></option><option value="active">Hoạt động</option><option value="draft">Bản nháp</option></select><CaretDown size={16} aria-hidden="true" /></label>
            <label className="approval-workflow-floating-field is-wide"><span>Tên quy trình <b aria-hidden="true">*</b></span><input name="name" placeholder="Tên quy trình" required minLength={2} /></label>
            <div
              className={`approval-workflow-floating-field approval-workflow-follower-picker is-wide${followerId || isFollowerOpen ? " has-value" : ""}${isFollowerOpen ? " is-open" : ""}`}
              ref={followerPickerRef}
            >
              <span id="approval-workflow-follower-label">Người theo dõi</span>
              <input name="followerId" type="hidden" value={followerId} />
              <input
                aria-autocomplete="list"
                aria-controls="approval-workflow-follower-list"
                aria-expanded={isFollowerOpen}
                aria-labelledby="approval-workflow-follower-label"
                autoComplete="off"
                placeholder="Xem và nhận thông báo"
                role="combobox"
                type="search"
                value={isFollowerOpen ? followerSearch : selectedFollower ? `${selectedFollower.fullName} (${selectedFollower.code})` : ""}
                onChange={(event) => {
                  setFollowerId("");
                  setFollowerSearch(event.target.value);
                  setIsFollowerOpen(true);
                }}
                onFocus={() => {
                  setFollowerSearch("");
                  setIsFollowerOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeFollowerPicker();
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    followerPickerRef.current?.querySelector<HTMLButtonElement>("[role='option']")?.focus();
                  }

                  if (event.key === "Enter" && isFollowerOpen && filteredFollowers[0]) {
                    event.preventDefault();
                    selectFollower(filteredFollowers[0]);
                  }
                }}
              />
              <MagnifyingGlass size={18} aria-hidden="true" />
              {isFollowerOpen ? (
                <div className="approval-workflow-follower-menu" id="approval-workflow-follower-list" role="listbox" aria-label="Danh sách người dùng">
                  <p>Danh sách người dùng</p>
                  <div className="approval-workflow-follower-options">
                    {filteredFollowers.length > 0 ? filteredFollowers.map((employee) => (
                      <button
                        aria-selected={employee.id === followerId}
                        className={employee.id === followerId ? "is-selected" : undefined}
                        key={employee.id}
                        role="option"
                        type="button"
                        onClick={() => selectFollower(employee)}
                        onKeyDown={(event) => {
                          if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Escape") return;
                          event.preventDefault();
                          if (event.key === "Escape") {
                            closeFollowerPicker();
                            return;
                          }

                          const options = [...(followerPickerRef.current?.querySelectorAll<HTMLButtonElement>("[role='option']") ?? [])];
                          const currentIndex = options.indexOf(event.currentTarget);
                          const nextIndex = event.key === "ArrowDown"
                            ? Math.min(currentIndex + 1, options.length - 1)
                            : Math.max(currentIndex - 1, 0);
                          options[nextIndex]?.focus();
                        }}
                      >
                        <span className="approval-workflow-follower-avatar" aria-hidden="true">{employee.fullName.trim().charAt(0).toLocaleUpperCase("vi")}</span>
                        <span><strong>{employee.fullName}</strong><small>{employee.code} · {employee.department}</small></span>
                      </button>
                    )) : <span className="approval-workflow-follower-empty">Không tìm thấy người dùng</span>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="approval-workflow-options">
            <FormCheckbox name="showFlowInObject" label="Hiển thị quy trình trong đối tượng" />
            <FormCheckbox name="allowAttachmentsAfterApproved" label="Cho phép đính kèm thêm tài liệu khi bản ghi đã duyệt" />
            <FormCheckbox name="allowDocumentChangesAfterApproved" label="Cho phép sửa, xóa tài liệu khi đã duyệt" />
            <FormCheckbox defaultChecked name="allowDiscussionAfterApproved" label="Cho phép thêm, sửa, xóa thảo luận khi bản ghi đã duyệt" />
          </div>

          <fieldset className="approval-workflow-overdue-options">
            <legend><CaretDown size={17} aria-hidden="true" /> Cài đặt khi bước duyệt quá hạn</legend>
            <label><input type="radio" name="overdueAction" value="auto_approve" /> Hệ thống tự động duyệt và chuyển sang bước tiếp theo</label>
            <label><input type="radio" name="overdueAction" value="auto_reject" /> Hệ thống tự động không duyệt</label>
            <label><input type="radio" name="overdueAction" value="substitute" /> Chuyển cho người duyệt thay thế</label>
            <label><input defaultChecked type="radio" name="overdueAction" value="none" /> Không áp dụng xử lý</label>
          </fieldset>
        </div>

        <div className={activeTab === "flow" ? "approval-workflow-form-panel is-active" : "approval-workflow-form-panel"} role="tabpanel">
          <div className="approval-workflow-flow-fields">
            <ApprovalWorkflowPicker
              groups={workflowObjectGroups}
              id="approval-workflow-object-type"
              label="Đối tượng"
              name="objectType"
              placeholder="Chọn đối tượng"
              required
              value={objectType}
              onValueChange={(nextValue) => {
                setObjectType(nextValue);
                setSubObject("");
              }}
            />
            {objectType !== "personnel_profile" ? (
              <ApprovalWorkflowPicker
                emptyMessage="Hãy chọn đối tượng trước"
                groups={objectType === "decision" ? decisionSubObjectGroups : []}
                id="approval-workflow-sub-object"
                label="Đối tượng con"
                name="subObject"
                placeholder="Chọn đối tượng con"
                value={subObject}
                onValueChange={setSubObject}
              />
            ) : null}
            <ApprovalWorkflowPicker
              groups={approvalTypeGroups}
              id="approval-workflow-approval-type"
              label="Loại quy trình"
              name="approvalType"
              placeholder="Loại quy trình"
              required
              value={approvalType}
              onValueChange={setApprovalType}
            />
            <input defaultValue="on" name="versionMode" type="hidden" />
            <input name="flowDefinition" readOnly type="hidden" value={JSON.stringify(flowDefinition)} />
          </div>

          <div className="approval-workflow-toolbar-shell" ref={nodePaletteRef}>
            <div className="approval-workflow-toolbar" aria-label="Công cụ sơ đồ">
              <div>
                <button type="button" aria-label="Hoàn tác" data-tooltip="Hoàn tác"><ArrowRight className="is-reversed" size={16} /></button>
                <button type="button" aria-label="Làm lại" data-tooltip="Làm lại"><ArrowRight size={16} /></button>
                <button
                  aria-controls="approval-workflow-node-palette"
                  aria-expanded={isNodePaletteOpen}
                  aria-haspopup="menu"
                  aria-label="Thêm bước"
                  className={isNodePaletteOpen ? "is-active" : undefined}
                  data-tooltip="Thêm bước"
                  type="button"
                  onClick={() => setIsNodePaletteOpen((current) => !current)}
                >
                  <SquaresFour size={16} />
                </button>
                <button type="button" aria-label="Tự động sắp xếp" data-tooltip="Tự động sắp xếp"><Network size={16} /></button>
              </div>
              <div>
                <button
                  aria-label={`Đường nối dạng ${workflowEdgeStyle === "straight" ? "thẳng" : "cong"}; nhấn để chuyển sang dạng ${workflowEdgeStyle === "straight" ? "cong" : "thẳng"}`}
                  aria-pressed={workflowEdgeStyle === "curved"}
                  data-tooltip={`Đường nối dạng ${workflowEdgeStyle === "straight" ? "thẳng" : "cong"}`}
                  type="button"
                  onClick={() => setWorkflowEdgeStyle((current) => current === "straight" ? "curved" : "straight")}
                >{workflowEdgeStyle === "straight" ? <FlowConnection size={16} /> : <CurvePath size={16} />}</button>
                <button type="button" aria-label="Thu vừa sơ đồ" data-tooltip="Thu vừa sơ đồ"><FitToScreen size={16} /></button>
                <button type="button" aria-label="Phóng to" data-tooltip="Phóng to"><Plus size={16} /></button>
                <button type="button" aria-label="Thu nhỏ" data-tooltip="Thu nhỏ">−</button>
              </div>
            </div>
            {isNodePaletteOpen ? (
              <div className="approval-workflow-node-palette" id="approval-workflow-node-palette" role="menu" aria-label="Chọn loại bước">
                {workflowNodeOptions.map((option) => (
                  <button
                    className={`is-${option.value}`}
                    key={option.value}
                    role="menuitem"
                    type="button"
                    onClick={() => addWorkflowNode(option.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      event.preventDefault();
                      const buttons = [...(nodePaletteRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? [])];
                      const currentIndex = buttons.indexOf(event.currentTarget);
                      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" ? 3 : -3;
                      buttons[(currentIndex + delta + buttons.length) % buttons.length]?.focus();
                    }}
                  >
                    <span className="approval-workflow-node-palette-icon"><WorkflowNodeTypeIcon type={option.value} /></span>
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="approval-workflow-canvas" aria-label="Sơ đồ quy trình duyệt" ref={workflowCanvasRef}>
            <div className={`approval-workflow-canvas-lane${connectionDraft ? " is-connecting" : ""}`} ref={workflowCanvasLaneRef}>
              <svg className="approval-workflow-edge-layer" aria-label="Các đường nối quy trình">
                {workflowEdgePaths.map((edge) => (
                  <g key={edge.id}>
                    <path className="approval-workflow-edge-path" d={edge.path} markerEnd="url(#approval-workflow-edge-arrow)" />
                    {isMatchedWorkflowBranch(edge.branch) || isUnmatchedWorkflowBranch(edge.branch) ? (
                      <text
                        className={`approval-workflow-edge-label is-${isMatchedWorkflowBranch(edge.branch) ? "matched" : "unmatched"}`}
                        dominantBaseline="middle"
                        textAnchor="end"
                        x={edge.labelX}
                        y={edge.labelY}
                      >
                        {isMatchedWorkflowBranch(edge.branch) ? "Thỏa mãn" : "Không thỏa mãn"}
                      </text>
                    ) : null}
                    <path
                      aria-label="Xóa đường nối"
                      className="approval-workflow-edge-hit-area"
                      d={edge.path}
                      role="button"
                      tabIndex={0}
                      onClick={() => removeWorkflowEdge(edge.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "Delete" && event.key !== "Backspace" && event.key !== "Enter") return;
                        event.preventDefault();
                        removeWorkflowEdge(edge.id);
                      }}
                    />
                  </g>
                ))}
                {connectionDraft ? (
                  <path
                    className="approval-workflow-edge-path is-draft"
                    d={connectionDraftPath}
                  />
                ) : null}
                <defs>
                  <marker id="approval-workflow-edge-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                    <path d="M 0 0 L 8 4 L 0 8 z" />
                  </marker>
                </defs>
              </svg>
              <div
                aria-label="Bắt đầu; có thể di chuyển"
                className="approval-workflow-start-node"
                data-workflow-node-id="start"
                role="button"
                style={{ left: startNodePosition.x, top: startNodePosition.y }}
                tabIndex={0}
                onKeyDown={(event) => {
                  const movement = {
                    ArrowLeft: [-10, 0],
                    ArrowRight: [10, 0],
                    ArrowUp: [0, -10],
                    ArrowDown: [0, 10]
                  }[event.key];
                  if (!movement) return;
                  event.preventDefault();
                  moveWorkflowNode("start", movement[0], movement[1]);
                }}
                onPointerDown={(event) => startNodeDrag("start", event)}
              >
                <span>▷</span> Bắt đầu
                <button
                  aria-label="Bắt đầu nối từ Bắt đầu"
                  className="approval-workflow-node-handle is-output"
                  data-workflow-output="default"
                  type="button"
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    startWorkflowConnection("start", event.currentTarget);
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startWorkflowConnection("start", event.currentTarget);
                  }}
                />
              </div>
              {workflowNodes.map((node, index) => (
                <WorkflowCanvasNodeCard
                  isConnecting={Boolean(connectionDraft)}
                  key={node.id}
                  node={node}
                  number={index + 2}
                  onConditionAdd={addConditionSlot}
                  onConditionClear={clearConditionSlot}
                  onConditionOpen={openConditionSlot}
                  onConnectionEnd={finishWorkflowConnection}
                  onConnectionStart={startWorkflowConnection}
                  onNodeMove={moveWorkflowNode}
                  onNodeOpen={openWorkflowNode}
                  onNodeContextMenu={openWorkflowNodeContextMenu}
                  onNodePointerDown={startNodeDrag}
                />
              ))}
            </div>
          </div>
        </div>

        {state.error ? <p className="approval-workflow-form-error" role="alert">{state.error}</p> : null}
        <footer className="approval-workflow-form-actions">
          <button className="primary-button" disabled={isPending} name="intent" value="active" type="submit">{isPending ? "ĐANG LƯU" : "CẬP NHẬT"}</button>
          <a className="secondary-button" href="/admin/settings/approval-workflows">HỦY BỎ</a>
          <button className="secondary-button" disabled={isPending} name="intent" value="draft" type="submit">LƯU NHÁP</button>
        </footer>
      </form>
      {nodeContextMenu && contextMenuNode?.type === "approval" ? (
        <WorkflowNodeContextMenu
          state={nodeContextMenu}
          onAddNode={addNodeFromContextMenu}
          onClose={() => setNodeContextMenu(null)}
          onDelete={deleteContextNode}
          onDeleteIncomingEdges={deleteContextNodeIncomingEdges}
          onDuplicate={duplicateContextNode}
          onSettings={() => {
            setEditingApprovalNodeId(nodeContextMenu.nodeId);
            setNodeContextMenu(null);
          }}
        />
      ) : null}
      {nodeContextMenu && contextMenuNode?.type === "condition" ? (
        <ConditionNodeContextMenu
          state={nodeContextMenu}
          onAddNode={addNodeFromConditionBranch}
          onClose={() => setNodeContextMenu(null)}
          onDelete={nodeContextMenu.conditionSlotId
            ? () => clearConditionSlot(nodeContextMenu.nodeId, nodeContextMenu.conditionSlotId!)
            : deleteContextNode}
        />
      ) : null}
      {editingApprovalNode?.type === "approval" ? (
        <ApprovalNodeSettingsModal
          employees={employees}
          key={editingApprovalNode.id}
          node={editingApprovalNode}
          onCancel={() => setEditingApprovalNodeId(null)}
          onSave={saveApprovalNodeConfig}
        />
      ) : null}
      {editingConditionNode?.type === "condition" ? (
        <ConditionNodeSettingsModal
          defaultName={`Điều kiện ${editingConditionSlotIndex + 1}`}
          key={`${editingConditionNode.id}:${editingConditionSlot?.slotId}`}
          node={{ ...editingConditionNode, conditionConfig: editingConditionConfig }}
          onCancel={() => setEditingConditionSlot(null)}
          onSave={saveConditionNodeConfig}
        />
      ) : null}
    </section>
  );
}

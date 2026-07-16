"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Columns, Export, ListBullets, Minus, Network, Plus, SquaresFour, UploadSimple, Users } from "@/lib/icons";
import { datedCsvFilename, exportCsv } from "@/lib/csv-export";
import type { DepartmentRecord, OrgChartData } from "@/lib/org-chart-api";

type DepartmentCanvasTab = "departments" | "business" | "types" | "inactive";

type DepartmentCanvasNode = {
  childCount: number;
  children: DepartmentCanvasNode[];
  code: string;
  headcount: number;
  id: string;
  isCompanyRoot?: boolean;
  name: string;
  parentId: string | null;
};

type PositionedCanvasNode = DepartmentCanvasNode & {
  accent: string;
  depth: number;
  x: number;
  y: number;
};

type CanvasConnection = {
  id: string;
  path: string;
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 58;
const X_GAP = 310;
const Y_GAP = 82;
const CANVAS_LEFT = 150;
const CANVAS_TOP = 76;
const CANVAS_RIGHT = 760;
const CANVAS_BOTTOM = 240;
const ZOOM_STEP = 10;
const MIN_ZOOM = 50;
const MAX_ZOOM = 130;
const CONNECTOR_RADIUS = 18;

const branchAccents = ["#ff6b35", "#2f7df6", "#11a36a", "#f59e0b", "#8b5cf6", "#14a3b8"];

function sortDepartments(departments: DepartmentRecord[]) {
  return [...departments].sort((left, right) =>
    left.code.localeCompare(right.code, "vi", { numeric: true, sensitivity: "base" })
  );
}

function buildTree(departments: DepartmentRecord[]) {
  const nodes = new Map<string, DepartmentCanvasNode>();
  const roots: DepartmentCanvasNode[] = [];

  for (const department of sortDepartments(departments.filter((item) => item.status === "active"))) {
    nodes.set(department.id, {
      childCount: department.childCount,
      children: [],
      code: department.code,
      headcount: department.headcount,
      id: department.id,
      isCompanyRoot: department.permissionStructure === "company",
      name: department.name,
      parentId: department.parentId
    });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function roundedElbowPath(startX: number, startY: number, middleX: number, endX: number, endY: number) {
  if (Math.abs(startY - endY) < 1) {
    return `M ${startX} ${startY} H ${endX}`;
  }

  const direction = endY > startY ? 1 : -1;
  const radius = Math.min(
    CONNECTOR_RADIUS,
    Math.abs(middleX - startX) / 2,
    Math.abs(endX - middleX) / 2,
    Math.abs(endY - startY) / 2
  );

  return [
    `M ${startX} ${startY}`,
    `H ${middleX - radius}`,
    `Q ${middleX} ${startY} ${middleX} ${startY + direction * radius}`,
    `V ${endY - direction * radius}`,
    `Q ${middleX} ${endY} ${middleX + radius} ${endY}`,
    `H ${endX}`
  ].join(" ");
}

function layoutTree(roots: DepartmentCanvasNode[]) {
  const positionedNodes: PositionedCanvasNode[] = [];
  const nodesById = new Map<string, PositionedCanvasNode>();
  let leafCursor = 0;
  let maxDepth = 0;

  const placeNode = (node: DepartmentCanvasNode, depth: number, accent: string): number => {
    maxDepth = Math.max(maxDepth, depth);
    const childYs: number[] = node.children.map((child, index) =>
      placeNode(child, depth + 1, depth === 0 ? branchAccents[index % branchAccents.length] : accent)
    );
    const y = childYs.length > 0
      ? (childYs[0] + childYs[childYs.length - 1]) / 2
      : CANVAS_TOP + leafCursor++ * Y_GAP;
    const positionedNode: PositionedCanvasNode = {
      ...node,
      accent: node.isCompanyRoot ? "#ef4444" : accent,
      depth,
      x: CANVAS_LEFT + depth * X_GAP,
      y
    };

    positionedNodes.push(positionedNode);
    nodesById.set(node.id, positionedNode);

    return y;
  };

  roots.forEach((root, index) => {
    placeNode(root, 0, branchAccents[index % branchAccents.length]);
  });

  const connections: CanvasConnection[] = [];

  for (const node of positionedNodes) {
    const parent = node.parentId ? nodesById.get(node.parentId) : undefined;

    if (!parent) {
      continue;
    }

    const startX = parent.x + NODE_WIDTH;
    const startY = parent.y + NODE_HEIGHT / 2;
    const endX = node.x;
    const endY = node.y + NODE_HEIGHT / 2;
    const middleX = startX + (endX - startX) / 2;

    connections.push({
      id: `${parent.id}-${node.id}`,
      path: roundedElbowPath(startX, startY, middleX, endX, endY)
    });
  }

  const maxY = positionedNodes.reduce((value, node) => Math.max(value, node.y), CANVAS_TOP);

  return {
    connections,
    height: maxY + NODE_HEIGHT + CANVAS_BOTTOM,
    nodes: positionedNodes,
    width: CANVAS_LEFT + maxDepth * X_GAP + NODE_WIDTH + CANVAS_RIGHT
  };
}

function ApiStatusBanner({ data }: { data: OrgChartData }) {
  if (data.source !== "unavailable") {
    return null;
  }

  return (
    <section className="account-api-banner admin-user-api-banner" role="status">
      <strong>Chưa kết nối được API phòng ban</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

export function DepartmentCanvasBoard({ data }: { data: OrgChartData }) {
  const [activeTab, setActiveTab] = useState<DepartmentCanvasTab>("departments");
  const [zoom, setZoom] = useState(100);
  const activeDepartments = useMemo(
    () => data.departments.filter((department) => department.status === "active"),
    [data.departments]
  );
  const inactiveDepartments = useMemo(
    () => data.departments.filter((department) => department.status !== "active"),
    [data.departments]
  );
  const tree = useMemo(() => buildTree(activeDepartments), [activeDepartments]);
  const layout = useMemo(() => layoutTree(tree), [tree]);
  const scale = zoom / 100;
  const scaledWidth = layout.width * scale;
  const scaledHeight = layout.height * scale;
  const tabs: Array<{ count: number; key: DepartmentCanvasTab; label: string }> = [
    { key: "departments", label: "Phòng ban, chi nhánh", count: activeDepartments.length },
    { key: "business", label: "Khối nghiệp vụ", count: 0 },
    { key: "types", label: "Loại phòng ban", count: 2 },
    { key: "inactive", label: "Phòng ban không hoạt động", count: inactiveDepartments.length }
  ];
  const exportDepartments = activeTab === "inactive" ? inactiveDepartments : activeDepartments;

  const handleExport = () => {
    exportCsv({
      filename: datedCsvFilename(activeTab === "inactive" ? "phong-ban-khong-hoat-dong" : "so-do-phong-ban"),
      rows: exportDepartments,
      columns: [
        { header: "Mã", value: (department) => department.code },
        { header: "Tên đơn vị", value: (department) => department.name },
        { header: "Đơn vị cha", value: (department) => department.parentName },
        { header: "Cấu trúc quyền", value: (department) => department.permissionStructure },
        { header: "Loại phòng ban", value: (department) => department.departmentType },
        { header: "Khối nghiệp vụ", value: (department) => department.businessUnit },
        { header: "Số nhân sự", value: (department) => department.headcount },
        { header: "Số đơn vị con", value: (department) => department.childCount },
        { header: "Trạng thái", value: (department) => department.status === "active" ? "Đang hoạt động" : "Đã đóng" }
      ]
    });
  };

  return (
    <main className="admin-user-list-page department-directory-page department-canvas-page" aria-label="Sơ đồ phòng ban">
      <ApiStatusBanner data={data} />

      <section className="department-canvas-view-actions" aria-label="Thao tác sơ đồ phòng ban">
        <a href="/admin/settings/org-chart">
          <ListBullets size={16} weight="duotone" aria-hidden="true" />
          <span>Danh sách</span>
        </a>
        <button type="button" disabled={exportDepartments.length === 0} onClick={handleExport}>
          <Export size={16} weight="duotone" aria-hidden="true" />
          <span>Export</span>
        </button>
        <button type="button">
          <UploadSimple size={16} weight="duotone" aria-hidden="true" />
          <span>Import</span>
        </button>
      </section>

      <nav className="department-directory-tabs" aria-label="Nhóm sơ đồ phòng ban">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.key ? "is-active" : undefined}
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </nav>

      <section className="department-canvas-shell" aria-label="Canvas sơ đồ phòng ban">
        {activeTab === "departments" ? (
          <>
            <div className="department-canvas-controls" aria-label="Điều khiển sơ đồ">
              <button type="button" aria-label="Chế độ sơ đồ cây">
                <Network size={17} weight="duotone" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Căn giữa sơ đồ" onClick={() => setZoom(100)}>
                <SquaresFour size={17} weight="duotone" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Phóng vừa màn hình" onClick={() => setZoom(80)}>
                <Columns size={17} weight="duotone" aria-hidden="true" />
              </button>
              <span className="department-canvas-control-divider" aria-hidden="true" />
              <div className="department-canvas-zoom-control" aria-label="Thu phóng sơ đồ">
                <button
                  type="button"
                  aria-label="Thu nhỏ sơ đồ"
                  disabled={zoom <= MIN_ZOOM}
                  onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP))}
                >
                  <Minus size={16} weight="duotone" aria-hidden="true" />
                </button>
                <strong>{zoom}%</strong>
                <button
                  type="button"
                  aria-label="Phóng to sơ đồ"
                  disabled={zoom >= MAX_ZOOM}
                  onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP))}
                >
                  <Plus size={16} weight="duotone" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="department-canvas-stage" tabIndex={0}>
              <div
                className="department-canvas-scaled-area"
                style={{ width: scaledWidth, height: scaledHeight } as CSSProperties}
              >
                <div
                  className="department-canvas-content"
                  style={
                    {
                      width: layout.width,
                      height: layout.height,
                      transform: `scale(${scale})`
                    } as CSSProperties
                  }
                >
                  <svg
                    className="department-canvas-connectors"
                    aria-hidden="true"
                    focusable="false"
                    height={layout.height}
                    width={layout.width}
                    viewBox={`0 0 ${layout.width} ${layout.height}`}
                  >
                    <defs>
                      <marker
                        id="department-canvas-arrow"
                        markerHeight="7"
                        markerWidth="7"
                        orient="auto"
                        refX="6"
                        refY="3.5"
                        viewBox="0 0 7 7"
                      >
                        <path className="department-canvas-arrow-head" d="M 0 0 L 7 3.5 L 0 7 z" />
                      </marker>
                    </defs>
                    {layout.connections.map((connection) => (
                      <path d={connection.path} key={connection.id} markerEnd="url(#department-canvas-arrow)" />
                    ))}
                  </svg>

                  {layout.nodes.map((node) => (
                    <article
                      className={node.isCompanyRoot ? "department-canvas-node is-company-root" : "department-canvas-node"}
                      key={node.id}
                      style={
                        {
                          "--department-node-accent": node.accent,
                          left: node.x,
                          top: node.y,
                          height: NODE_HEIGHT,
                          width: NODE_WIDTH,
                        } as CSSProperties
                      }
                    >
                      <span className="department-canvas-node-icon">
                        {node.isCompanyRoot ? (
                          <Network size={16} weight="duotone" aria-hidden="true" />
                        ) : (
                          <Users size={16} weight="duotone" aria-hidden="true" />
                        )}
                      </span>
                      <span className="department-canvas-node-title">{node.name}</span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="department-canvas-empty">
            <span>Chưa có dữ liệu để hiển thị trên sơ đồ.</span>
          </div>
        )}
      </section>
    </main>
  );
}

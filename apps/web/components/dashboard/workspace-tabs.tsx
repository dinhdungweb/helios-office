"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  CheckCircle,
  Clock,
  FileText,
  UsersThree
} from "@/lib/icons";
import type { Announcement, PendingApproval } from "@/lib/mock-data";

type WorkspaceTabsProps = {
  announcements: Announcement[];
  hrMetrics: Array<{ label: string; value: string; trend: string }>;
  pendingApprovals: PendingApproval[];
};

export function WorkspaceTabs({
  announcements,
  hrMetrics,
  pendingApprovals
}: WorkspaceTabsProps) {
  return (
    <Tabs.Root className="workspace-card" defaultValue="overview">
      <Tabs.List className="tabs-list" aria-label="Tổng quan vận hành">
        <Tabs.Trigger value="overview">Tổng quan</Tabs.Trigger>
        <Tabs.Trigger value="approvals">Chờ duyệt</Tabs.Trigger>
        <Tabs.Trigger value="announcements">Thông báo</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="overview" className="tabs-panel">
        <div className="metric-grid">
          {hrMetrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.value}</span>
              <strong>{metric.label}</strong>
              <small>{metric.trend}</small>
            </article>
          ))}
        </div>
      </Tabs.Content>

      <Tabs.Content value="approvals" className="tabs-panel">
        <div className="approval-table" role="table" aria-label="Danh sách việc chờ duyệt">
          <div role="row" className="approval-row approval-row--header">
            <span role="columnheader">Loại</span>
            <span role="columnheader">Người gửi</span>
            <span role="columnheader">Chi tiết</span>
            <span role="columnheader">Hạn</span>
          </div>
          {pendingApprovals.map((approval) => (
            <div role="row" className="approval-row" key={approval.id}>
              <span role="cell">
                <Clock size={16} weight="duotone" aria-hidden="true" />
                {approval.type}
              </span>
              <span role="cell">{approval.owner}</span>
              <span role="cell">{approval.detail}</span>
              <span role="cell">{approval.due}</span>
            </div>
          ))}
        </div>
      </Tabs.Content>

      <Tabs.Content value="announcements" className="tabs-panel">
        <div className="announcement-grid">
          {announcements.map((announcement) => (
            <article className="announcement-card" key={announcement.id}>
              <FileText size={18} weight="duotone" aria-hidden="true" />
              <div>
                <strong>{announcement.title}</strong>
                <p>{announcement.audience}</p>
                <small>{announcement.time}</small>
              </div>
              <span>
                <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                {announcement.readRate}%
              </span>
            </article>
          ))}
        </div>
      </Tabs.Content>

      <div className="quick-workflow" aria-label="Hành động nhanh">
        <button type="button">
          <UsersThree size={17} weight="duotone" aria-hidden="true" />
          Thêm nhân viên
        </button>
        <button type="button">
          <Clock size={17} weight="duotone" aria-hidden="true" />
          Duyệt đơn
        </button>
        <button type="button">
          <FileText size={17} weight="duotone" aria-hidden="true" />
          Khóa bảng công
        </button>
      </div>
    </Tabs.Root>
  );
}

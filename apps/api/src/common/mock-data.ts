export const employees = [
  {
    id: "emp-001",
    code: "HL-001",
    name: "Đặng Đình Dũng",
    department: "Technology",
    title: "Web Lead",
    managerId: "emp-010",
    status: "active",
    startDate: "2024-03-15"
  },
  {
    id: "emp-002",
    code: "HL-002",
    name: "Nguyễn Hải Anh",
    department: "People Operations",
    title: "HR Executive",
    managerId: "emp-011",
    status: "active",
    startDate: "2023-09-01"
  },
  {
    id: "emp-003",
    code: "HL-003",
    name: "Lê Minh Khang",
    department: "Sales",
    title: "Sales Specialist",
    managerId: "emp-012",
    status: "active",
    startDate: "2025-01-06"
  }
];

export const departments = [
  { id: "dep-001", name: "Technology", headId: "emp-001", parentId: null, headcount: 24 },
  { id: "dep-002", name: "People Operations", headId: "emp-002", parentId: null, headcount: 8 },
  { id: "dep-003", name: "Sales", headId: "emp-003", parentId: null, headcount: 65 },
  { id: "dep-004", name: "Operations", headId: "emp-010", parentId: null, headcount: 42 }
];

export const contracts = [
  {
    id: "ctr-001",
    employeeId: "emp-001",
    type: "indefinite",
    startDate: "2024-03-15",
    endDate: null,
    status: "active"
  },
  {
    id: "ctr-002",
    employeeId: "emp-002",
    type: "fixed_term",
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    status: "renewal_due"
  }
];

export const posts = [
  {
    id: "post-001",
    authorId: "emp-002",
    scope: "company",
    title: "Thông báo cập nhật chính sách hàng hóa vòng tay ngày 06/07/2026",
    body: "Các phòng ban bán hàng, marketing và kho vận cập nhật quy trình tư vấn, đóng gói và bàn giao.",
    reactions: 1,
    comments: 0,
    requiresAck: true,
    createdAt: "2026-07-06T04:01:00.000Z"
  },
  {
    id: "post-002",
    authorId: "emp-002",
    scope: "department",
    title: "Thông báo thay đổi sản phẩm ra mắt ngày 07/07/2026",
    body: "Phòng Marketing cập nhật nội dung, phòng bán hàng thay đổi kịch bản tư vấn.",
    reactions: 8,
    comments: 3,
    requiresAck: false,
    createdAt: "2026-07-04T02:36:00.000Z"
  }
];

export const announcements = [
  {
    id: "ann-001",
    title: "Điều chuyển vị trí",
    audience: "operations",
    readRate: 89,
    publishedAt: "2026-04-11T07:31:00.000Z"
  },
  {
    id: "ann-002",
    title: "Update v.v Nhân sự mua hàng nội bộ",
    audience: "company",
    readRate: 76,
    publishedAt: "2026-04-06T08:33:00.000Z"
  }
];

export const approvals = [
  {
    id: "apr-001",
    type: "leave_request",
    ownerId: "emp-002",
    ownerName: "Nguyễn Hải Anh",
    detail: "Nghỉ 1 ngày, còn 6 ngày phép",
    status: "pending",
    priority: "high",
    dueAt: "2026-07-09"
  },
  {
    id: "apr-002",
    type: "attendance_adjustment",
    ownerId: "emp-003",
    ownerName: "Lê Minh Khang",
    detail: "Bổ sung check-out 18:02",
    status: "pending",
    priority: "normal",
    dueAt: "2026-07-10"
  }
];

export const leaveRequests = [
  {
    id: "leave-001",
    employeeId: "emp-002",
    employeeName: "Nguyễn Hải Anh",
    type: "annual_leave",
    fromDate: "2026-07-10",
    toDate: "2026-07-10",
    totalDays: 1,
    status: "pending_manager",
    remainingBalance: 6
  },
  {
    id: "leave-002",
    employeeId: "emp-003",
    employeeName: "Lê Minh Khang",
    type: "business_trip",
    fromDate: "2026-07-14",
    toDate: "2026-07-15",
    totalDays: 2,
    status: "approved",
    remainingBalance: 9
  }
];

export const attendanceRecords = [
  {
    id: "att-001",
    employeeId: "emp-001",
    workDate: "2026-07-09",
    checkIn: "08:27",
    checkOut: "18:04",
    status: "valid"
  },
  {
    id: "att-002",
    employeeId: "emp-003",
    workDate: "2026-07-09",
    checkIn: "08:58",
    checkOut: null,
    status: "missing_checkout"
  }
];

export const payrollCycles = [
  {
    id: "pay-2026-06",
    name: "Lương tháng 06/2026",
    status: "reviewing",
    employeeCount: 200,
    grossAmount: 4250000000,
    lockedAttendanceAt: "2026-07-03T10:00:00.000Z"
  }
];

export const reports = {
  headcount: 200,
  attendanceRate: 0.96,
  pendingApprovals: 18,
  announcementReadRate: 0.86,
  turnoverThisQuarter: 0.035
};

export const notifications = [
  {
    id: "noti-001",
    userId: "emp-001",
    event: "approval.changed",
    title: "Đơn nghỉ phép cần duyệt",
    readAt: null,
    createdAt: "2026-07-09T02:00:00.000Z"
  }
];

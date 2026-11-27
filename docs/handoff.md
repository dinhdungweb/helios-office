# Bàn giao phiên làm việc

Đọc file này trước tiên khi bắt đầu một phiên mới (máy mới, người mới, hoặc Claude Code ở phiên khác). Cập nhật nó mỗi khi dừng giữa chừng. Cập nhật lần cuối: 2026-11-27.

## Đang ở đâu

- **Nhánh làm việc:** `feat/phase-2`, đã push lên `origin`. Chưa merge vào `main`; **PR chưa mở** (nội dung PR soạn sẵn ở mục "PR" bên dưới).
- **Phase 0, 1:** đã đóng, đã merge `main`.
- **Phase 2 (chấm công):** 33/33 item `done`, gate kỹ thuật pass. **Chưa đóng phase:** còn task 24 (đối chiếu một tháng log máy chấm công thật với bảng công HR tính tay), xem `docs/plans/phase-2.md`.
- **Phase 3a (engine phê duyệt + nghỉ phép):** xong 2026-11-27, đã thử tay toàn bộ trên DB local. Phase 3 đạt 35/53 item.
- **Phase 3b:** chưa bắt đầu.
- Kiểm tra lần cuối: typecheck sạch, lint 0 lỗi (88 cảnh báo, ngưỡng 89), 524 unit + 47 e2e pass, `npm run audit:features -- --strict` 0 lỗi.

## Nguồn sự thật

| Cần biết | Đọc |
|---|---|
| Phạm vi và trạng thái từng chức năng | `docs/backlog.yaml` (`npm run audit:features`, thêm `-- --phase 3`) |
| Thứ tự phase, điều kiện bắt đầu / đóng | `docs/roadmap.md` |
| Task chi tiết của phase đang làm | `docs/plans/phase-3.md` |
| Thiết kế engine phê duyệt (đã duyệt cùng mục 13) | `docs/design/approval-engine.md` |
| Đã làm gì, theo ngày | `docs/progress-changelog.md` |
| Quy tắc làm việc trong repo | `CLAUDE.md` / `AGENTS.md` |

## Việc tiếp theo (theo thứ tự)

1. **Mở PR** `feat/phase-2` → `main` với nội dung ở mục "PR". Trên máy Windows `gh` chưa đăng nhập và GitHub yêu cầu bật 2FA cho tài khoản `dungdev1010`.
2. **Phase 3b** (`docs/plans/phase-3.md` task 9–12):
   - Task 9: đơn vắng mặt, làm thêm (OT), giải trình chấm công, đổi ca, thôi việc (LV-17 → LV-21) và cập nhật công cho từng loại (AT-22). Mỗi loại là một `RequestTypeHandler` như `apps/api/src/modules/leave/leave-request.handler.ts`, đăng ký vào `RequestTypeRegistry`. Form web có sẵn dạng tĩnh ở `apps/web/components/user/*-request-create-board.tsx`.
   - Task 10: chuyển tiếp, duyệt hàng loạt, người theo dõi, đính kèm (AP-17, AP-18, AP-20, LV-08).
   - Task 11: uỷ quyền, quá hạn, trang cảnh báo duyệt, đính kèm email (AU-21, AP-21, AP-22, AP-24, AP-26). Bảng `ApprovalDelegation` và phần engine thêm người được uỷ quyền đã có sẵn.
   - Task 12: đơn công tác, đề xuất chung, lịch nghỉ phòng ban (LV-22, LV-23, LV-25).
3. **Đóng Phase 2** khi có dữ liệu thật cho task 24.

## Dựng môi trường trên máy mới

```bash
git clone https://github.com/dinhdungweb/helios-office.git
cd helios-office
git checkout feat/phase-2
# .env KHÔNG có trong git (chứa secret): chép tay từ máy cũ vào thư mục gốc repo.
npm install
docker compose up -d postgres redis keycloak minio
npm run prisma:generate
cd apps/api && npx prisma migrate deploy && cd ../..
npm run db:seed
npm run keycloak:bootstrap
npm run dev            # web :3000, API :4000, worker
```

- Tài khoản thử (mật khẩu `KEYCLOAK_SEED_PASSWORD` trong `.env`, mặc định `Welcome@123`): `admin` (system admin, không gắn hồ sơ nhân sự), `khanglm` (trưởng phòng Bán hàng online), `haianh` (trưởng phòng HCNS).
- **DB trên máy mới là DB mới**: dữ liệu thử trên máy Windows không đi theo (quy trình NP-HCNS / NP-NAM, các đơn NP-2026-000003 → 000005, quản lý trực tiếp của Khang = Hải Anh). Muốn thử luồng duyệt thì đặt quản lý trực tiếp cho `khanglm` hoặc tạo quy trình duyệt cho Đơn xin nghỉ (Nhân sự → Cài đặt → Quy trình duyệt). Trong seed không ai vừa có quyền quản trị quy trình vừa gắn hồ sơ nhân sự, nên đơn không có người duyệt sẽ bị đánh dấu "cần kiểm tra".
- Worker cộng phép năm mỗi giờ: muốn có số dư thì để `npm run dev` chạy worker ít nhất 1 phút.

## Quy ước đã thống nhất với chủ dự án

- **Trả lời bằng tiếng Việt** (tên kỹ thuật giữ nguyên).
- **HCNS là nhóm quyền, không phải khu riêng**: màn hình HR đặt trong phân hệ, ẩn hiện theo quyền như 1Office; `/hcns` không dùng nữa.
- **Cài đặt nằm trong phân hệ của nó** (như 1Office): ví dụ Đơn từ → Cài đặt → Loại nghỉ, Công → Cài đặt. Không đưa vào Cài đặt Nhân sự.
- Thiết kế Phase 3: đã đồng ý toàn bộ đề xuất ở mục 13 của `docs/design/approval-engine.md` (VÀ trong nhóm / HOẶC giữa nhóm; không có quy trình thì quản lý trực tiếp duyệt; người duyệt trùng người tạo thì bỏ qua, bước cuối thì lên cấp trên; gửi lại thì chạy từ đầu; thời hạn theo giờ đồng hồ; 12 ngày phép + thâm niên, tồn hết hạn 31/03, thử việc chưa dùng được, cấm vượt quỹ; nhân viên không tự huỷ đơn đã duyệt).

## Mẹo đã rút ra

- `note` trong `docs/backlog.yaml` luôn đặt trong ngoặc kép (dấu `: ` làm hỏng YAML). Chạy `npm run audit:features -- --strict` sau mỗi lần sửa backlog.
- Lọc kết quả Jest bằng `grep -E "Tests:|Suites:|failed to run"`; Jest báo "worker ran out of memory" là do máy thiếu RAM, chạy lại với `--runInBand`.
- Không xoá `.next` / `dist` và không chạy `npm run build` khi `npm run dev` đang chạy. Nếu Next báo lỗi lạ (Module not found với package đã cài, "Manifest file is empty", "adapterFn is not a function") thì cache dev hỏng: dừng dev rồi xoá `apps/web/.next/dev`.
- Trang thiết kế quy trình (`approval-workflow-create-board.tsx`, ~2.800 dòng) biên dịch lần đầu rất lâu; máy ít RAM có thể làm treo trình duyệt / dev server.
- Script sửa file có ký tự `\` hoặc regex: viết ra file `.cjs` rồi chạy bằng `node`, không dùng heredoc / `node -e` (Git Bash nuốt dấu `\`).
- Cấu hình node trong sơ đồ quy trình: màn thiết kế gửi `config` / `conditions`; server chuẩn hoá về `approvalConfig` / `notificationConfig` / `emailConfig` / `conditionSlots` (`apps/api/src/modules/approvals/engine/flow.ts`).

## PR

- Tiêu đề: `Phase 2 (chấm công) + Phase 3a (engine phê duyệt, nghỉ phép)`.
- Nội dung chính:
  - Phase 2: các phần đã làm, chưa đóng vì còn task 24.
  - Phase 3a: engine phê duyệt, quy trình, nghỉ phép, bảng công, giao diện Đơn từ.
  - Cần chú ý khi review:
    - Migration `20261126010000_approval_engine` chép `LeaveRequest` sang `Request` rồi xoá bảng cũ, xoá `ApprovalRequest`; nên sao lưu DB trước khi áp.
    - `GET /approvals` giờ chỉ cần đăng nhập; quyền duyệt là "được giao ở bước".
    - Đã sửa lỗi định dạng `config` của màn thiết kế.
    - Sửa tay của HR không còn đụng tới ngày nghỉ theo đơn.
  - Kiểm tra: số liệu ở mục "Đang ở đâu". CI GitHub chưa chạy được vì tài khoản bị khoá billing.
  - Chưa làm: Phase 3b.

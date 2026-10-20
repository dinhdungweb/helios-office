# Thiết kế: Import / export Excel

Backlog: `CORE-18`, `CORE-19` (và mở khoá `HR-29`, `HR-30`, `CT-15`, `AT-18`, `PY-18`, `RP-11`) · Phase 1 · Trạng thái: **Đã làm 2026-10-20**

## 1. Mục tiêu

Một khung dùng chung để mọi module import/export Excel giống nhau: cùng cách tải mẫu, cùng màn hình báo lỗi theo dòng, cùng cách tải file kết quả. Mỗi module chỉ viết một *handler* mô tả cột, cách kiểm tra và cách ghi dữ liệu.

## 2. Luồng

Import:

1. `GET /imports/templates/:type` — file mẫu `.xlsx` gồm dòng tiêu đề (cột bắt buộc có dấu `*`) và một dòng ví dụ in nghiêng.
2. Upload file qua dịch vụ file (`docs/design/file-storage.md`): `POST /files/presign` với `purpose: import_file`, `ownerId` = id tài khoản của chính mình → PUT → `complete`. Chỉ nhận `.xlsx`.
3. `POST /imports { type, fileId }` → tạo `ImportJob` (status `validating`), xếp job `imports/validate`.
4. Worker đọc file, ghép cột theo tiêu đề (không phân biệt hoa thường, dấu, dấu `*`, có thể khai báo tên thay thế), bỏ dòng trống và dòng ví dụ, rồi gọi `handler.validate` cho toàn bộ dòng → `validated` (không lỗi) hoặc `invalid` (có lỗi).
5. `GET /imports/:id` — số dòng, lỗi theo `{ row, column, message }` (số dòng đúng như trong Excel, tối đa 500 lỗi), 20 dòng hợp lệ đầu để xem trước.
6. `POST /imports/:id/commit { skipInvalid? }` — có lỗi mà không đặt `skipInvalid` → 409. Trạng thái chuyển `committing` một cách nguyên tử (bấm hai lần không nhập hai lần) → worker gọi `handler.commit` trong **một transaction** → `committed` + `result` (ví dụ `{ created, updated }`).

Export:

1. `POST /exports { type, params }` → `handler.parseParams` kiểm tra bộ lọc, phạm vi dữ liệu được chốt **lúc yêu cầu** và lưu vào job, ghi audit `export.create`.
2. Worker gọi `handler.rows(params, { scope })` → tạo `.xlsx` → `StoredFile` (`purpose: export_file`, chủ sở hữu = tài khoản yêu cầu).
3. `GET /exports/:id` — khi `ready` trả `downloadUrl` hạn 5 phút; gọi lại để lấy link mới.

`GET /imports/types`, `GET /exports/types` trả các loại người gọi được dùng (để dựng UI).

## 3. Quyền và phạm vi

- Mỗi handler khai báo `permissionKeys`; người gọi cần ít nhất một khoá (system_admin luôn được). Phạm vi dữ liệu là phạm vi rộng nhất trong các khoá đó (`DataScopeService.resolve`), lưu vào job để worker dùng.
- Job chỉ người tạo xem được; người khác nhận 404. File `import_file`/`export_file` chỉ chủ sở hữu tải/xoá được (`AccountFilePolicy`).
- Audit: `import.create`, `import.commit` (kèm số dòng, kết quả), `export.create` (kèm bộ lọc, mức phạm vi); handler ghi thêm audit cho từng bản ghi khi commit.

## 4. Viết một handler

```ts
@Injectable()
export class XImportHandler implements ImportHandler<Row>, OnModuleInit {
  readonly type = "x";
  readonly title = "Tên hiển thị";
  readonly permissionKeys = ["..."];
  readonly columns = [{ key: "code", header: "Mã", required: true, example: "X-01" }, ...];
  constructor(private readonly prisma: PrismaService, private readonly registry: ImportExportRegistry) {}
  onModuleInit() { this.registry.registerImport(this); }
  async validate(rows, context) { /* nạp tra cứu một lần, bắt trùng trong file */ }
  async commit(rows, context) { return this.prisma.$transaction(async (tx) => { ... }); }
}
```

Handler phải nằm trong một module **chỉ phụ thuộc Prisma / DataScope / registry** (ví dụ `EmployeeTransferModule`), được nạp ở cả `AppModule` và `WorkerModule`.

Handler hiện có: export `employees` (HR-30), import `job_positions` (danh mục vị trí, khớp theo mã: mã mới → tạo, mã có sẵn → cập nhật).

## 5. Giới hạn

- Tối đa 5.000 dòng mỗi file; dung lượng theo giới hạn tài liệu (25MB).
- Hàng đợi không hoạt động → 503, job import đánh `failed` (không có đường xử lý thay thế như thông báo).
- Chưa có: dọn file export/import cũ (cùng việc dọn file pending ở `CORE-12`), danh sách job của tôi, báo realtime khi xong (UI hỏi lại định kỳ).

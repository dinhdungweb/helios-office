// What each kind of stored file may be (docs/design/file-storage.md §5). Limits come from env
// (FILE_MAX_IMAGE_MB / FILE_MAX_DOCUMENT_MB, defaults 10 / 25 as agreed on 2026-10-20).

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ...IMAGE_MIME_TYPES
] as const;

export type FileKind = "image" | "document";

export const FILE_PURPOSES = {
  employee_document: { kind: "document", ownerType: "Employee" },
  contract_scan: { kind: "document", ownerType: "Contract" },
  request_attachment: { kind: "document", ownerType: "ApprovalRequest" },
  checkin_photo: { kind: "image", ownerType: "AttendanceRecord" },
  post_media: { kind: "image", ownerType: "Post" },
  workflow_attachment: { kind: "document", ownerType: "ApprovalWorkflowDefinition" },
  document: { kind: "document", ownerType: "Document" }
} as const satisfies Record<string, { kind: FileKind; ownerType: string }>;

export type FilePurpose = keyof typeof FILE_PURPOSES;

export function isFilePurpose(value: unknown): value is FilePurpose {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(FILE_PURPOSES, value);
}

export function allowedMimeTypes(purpose: FilePurpose): readonly string[] {
  return FILE_PURPOSES[purpose].kind === "image" ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
}

export function maxBytes(purpose: FilePurpose, limitsMb: { image: number; document: number }) {
  return (FILE_PURPOSES[purpose].kind === "image" ? limitsMb.image : limitsMb.document) * 1024 * 1024;
}

// Object keys never use the original name directly (odd characters, path tricks); it only survives
// as a short ASCII slug for readability. The original name lives in StoredFile.fileName.
export function safeFileSlug(fileName: string) {
  // Some clients send a path; keep only the last segment.
  const name = fileName.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  return [base || "file", extension].filter(Boolean).join(".");
}

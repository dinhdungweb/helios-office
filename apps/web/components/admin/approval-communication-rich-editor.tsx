"use client";

import { useEffect, useState } from "react";
import { createTheme, MantineProvider } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// Layered Mantine styles rank below the unlayered design-system rules in globals.css.
import "@mantine/core/styles.layer.css";
import "@mantine/tiptap/styles.layer.css";
import {
  BookmarkSimple,
  FitToScreen,
  ImageBroken,
  MagicWand,
  Package
} from "@/lib/icons";

type InsertMenu = "templates" | "blocks" | "dynamic" | null;

const editorTheme = createTheme({
  fontFamily: "var(--font-family-primary, 'Inter Tight', Roboto, Arial, sans-serif)",
  primaryColor: "dark"
});

const editorLabels = {
  alignCenterControlLabel: "Căn giữa",
  alignJustifyControlLabel: "Căn đều",
  alignLeftControlLabel: "Căn trái",
  alignRightControlLabel: "Căn phải",
  boldControlLabel: "In đậm",
  bulletListControlLabel: "Danh sách không thứ tự",
  clearFormattingControlLabel: "Xóa định dạng",
  h2ControlLabel: "Tiêu đề 2",
  h3ControlLabel: "Tiêu đề 3",
  italicControlLabel: "In nghiêng",
  linkControlLabel: "Thêm liên kết",
  linkEditorInputLabel: "Đường dẫn liên kết",
  linkEditorInputPlaceholder: "https://",
  linkEditorSave: "Lưu",
  orderedListControlLabel: "Danh sách có thứ tự",
  redoControlLabel: "Làm lại",
  strikeControlLabel: "Gạch ngang",
  underlineControlLabel: "Gạch chân",
  undoControlLabel: "Hoàn tác",
  unlinkControlLabel: "Xóa liên kết"
};

const insertOptions = {
  templates: [
    {
      label: "Mẫu thông báo phê duyệt",
      html: "<p>Xin chào {{recipient.name}},</p><p>Bạn có một nội dung đang chờ xử lý trong quy trình <strong>{{workflow.name}}</strong>.</p>"
    },
    {
      label: "Mẫu thông báo kết quả",
      html: "<p>Quy trình <strong>{{workflow.name}}</strong> đã được cập nhật trạng thái.</p>"
    }
  ],
  blocks: [
    { label: "Lời chào", html: "<p>Xin chào {{recipient.name}},</p>" },
    { label: "Thông tin quy trình", html: "<p><strong>Quy trình:</strong> {{workflow.name}}</p>" },
    { label: "Lời kết", html: "<p>Trân trọng.</p>" }
  ],
  dynamic: [
    { label: "Tên quy trình", html: "{{workflow.name}}" },
    { label: "Tên người nhận", html: "{{recipient.name}}" },
    { label: "Tên người tạo", html: "{{creator.name}}" }
  ]
} satisfies Record<Exclude<InsertMenu, null>, Array<{ label: string; html: string }>>;

export function ApprovalCommunicationRichEditor({
  value,
  hasError,
  onChange
}: {
  value: string;
  hasError: boolean;
  onChange: (value: string) => void;
}) {
  const [insertMenu, setInsertMenu] = useState<InsertMenu>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false
      }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false
      }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Nhập nội dung" })
    ],
    editorProps: {
      attributes: {
        "aria-label": "Nhập nội dung",
        "aria-multiline": "true",
        "aria-required": "true",
        role: "textbox"
      }
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML())
  });

  useEffect(() => {
    if (!editor || editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const insertContent = (html: string) => {
    editor?.chain().focus().insertContent(html).run();
    setInsertMenu(null);
  };

  const insertImage = () => {
    const url = window.prompt("Nhập đường dẫn ảnh", "https://");
    if (url?.trim()) editor?.chain().focus().setImage({ src: url.trim() }).run();
  };

  const insertControl = (
    menu: Exclude<InsertMenu, null>,
    label: string,
    Icon: typeof BookmarkSimple
  ) => (
    <RichTextEditor.Control
      active={insertMenu === menu}
      aria-expanded={insertMenu === menu}
      aria-haspopup="menu"
      aria-label={label}
      title={label}
      onClick={() => setInsertMenu((current) => current === menu ? null : menu)}
    >
      <Icon aria-hidden="true" size={16} />
    </RichTextEditor.Control>
  );

  return (
    <MantineProvider theme={editorTheme}>
      <div
        className={`communication-rich-editor${hasError ? " has-error" : ""}${isExpanded ? " is-expanded" : ""}`}
      >
        <RichTextEditor
          editor={editor}
          labels={editorLabels}
          variant="subtle"
          withTypographyStyles={false}
        >
          <RichTextEditor.Toolbar aria-label="Công cụ định dạng nội dung">
            <RichTextEditor.ControlsGroup>
              {insertControl("templates", "Thư viện mẫu", BookmarkSimple)}
              {insertControl("blocks", "Khối dựng sẵn", Package)}
              {insertControl("dynamic", "Từ khóa động", MagicWand)}
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.AlignLeft />
              <RichTextEditor.AlignCenter />
              <RichTextEditor.AlignRight />
              <RichTextEditor.AlignJustify />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control aria-label="Chèn ảnh" title="Chèn ảnh" onClick={insertImage}>
                <ImageBroken aria-hidden="true" size={16} />
              </RichTextEditor.Control>
              <RichTextEditor.Control
                aria-label={isExpanded ? "Thu nhỏ trình soạn thảo" : "Phóng to trình soạn thảo"}
                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                onClick={() => setIsExpanded((current) => !current)}
              >
                <FitToScreen aria-hidden="true" size={16} />
              </RichTextEditor.Control>
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          {insertMenu ? (
            <div
              aria-label={insertMenu === "templates" ? "Thư viện mẫu" : insertMenu === "blocks" ? "Khối dựng sẵn" : "Từ khóa động"}
              className="communication-rich-editor-menu"
              role="menu"
            >
              {insertOptions[insertMenu].map((option) => (
                <button key={option.label} role="menuitem" type="button" onClick={() => insertContent(option.html)}>
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <RichTextEditor.Content className="communication-rich-editor-content" />
        </RichTextEditor>
      </div>
    </MantineProvider>
  );
}

"use client";

import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type DialogHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { X } from "@/lib/icons";

type ClassValue = string | false | null | undefined;

function cn(...classNames: ClassValue[]) {
  return classNames.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "text";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
};

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: "primary-button",
  secondary: "secondary-button",
  text: "text-button"
};

export function Button({ children, className, disabled, icon, isLoading = false, type = "button", variant = "secondary", ...props }: ButtonProps) {
  return (
    <button className={cn(buttonClassByVariant[variant], className)} disabled={disabled || isLoading} type={type} {...props}>
      {icon}
      {isLoading ? "Đang xử lý" : children}
    </button>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
  label: string;
};

export function IconButton({ children, className, isActive = false, label, title, type = "button", ...props }: IconButtonProps) {
  return (
    <button className={cn("icon-button", isActive && "is-active", className)} type={type} aria-label={label} title={title ?? label} {...props}>
      {children}
    </button>
  );
}

type ModalDialogProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, "title"> & {
  children: ReactNode;
  labelledBy?: string;
  onCloseRequest: () => void;
  title: string;
};

export const ModalDialog = forwardRef<HTMLDialogElement, ModalDialogProps>(function ModalDialog(
  { children, className, labelledBy, onCloseRequest, title, ...props },
  ref
) {
  const generatedTitleId = useId();
  const titleId = labelledBy ?? generatedTitleId;

  return (
    <dialog className={cn("account-dialog", className)} aria-labelledby={titleId} ref={ref} {...props}>
      <header className="account-dialog-header">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Dong" onClick={onCloseRequest}>
          <X size={16} weight="duotone" aria-hidden="true" />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
});

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  helpText?: ReactNode;
  label: ReactNode;
  wide?: boolean;
};

export function FormField({ children, className, error, helpText, label, wide = false }: FormFieldProps) {
  return (
    <label className={cn("form-field", wide && "form-field--wide", className)}>
      <span>{label}</span>
      {children}
      {helpText ? <small className="form-field-help">{helpText}</small> : null}
      {error ? <small className="form-field-error">{error}</small> : null}
    </label>
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput({ className, ...props }, ref) {
  return <input className={cn("form-input", className)} ref={ref} {...props} />;
});

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea({ className, ...props }, ref) {
  return <textarea className={cn("form-textarea", className)} ref={ref} {...props} />;
});

export function ToolbarActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("toolbar-actions", className)}>{children}</div>;
}

export function ResponsiveTable({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <div className={cn("responsive-table-shell", className)} tabIndex={0} aria-label={label}>
      {children}
    </div>
  );
}

type StateBlockTone = "empty" | "error" | "loading" | "success";

export function StateBlock({
  action,
  children,
  className,
  title,
  tone = "empty"
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  title: ReactNode;
  tone?: StateBlockTone;
}) {
  return (
    <div className={cn("state-block", `state-block--${tone}`, className)} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
      {action ? <div className="state-block-action">{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: Omit<Parameters<typeof StateBlock>[0], "tone">) {
  return <StateBlock tone="empty" {...props} />;
}

export function ErrorState(props: Omit<Parameters<typeof StateBlock>[0], "tone">) {
  return <StateBlock tone="error" {...props} />;
}

export function LoadingState(props: Omit<Parameters<typeof StateBlock>[0], "tone">) {
  return <StateBlock tone="loading" {...props} />;
}

"use client";

import { X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-[400px]",
  md: "sm:max-w-[500px]",
  lg: "sm:max-w-[600px]",
  xl: "sm:max-w-[800px]",
  full: "sm:max-w-[90vw]",
};

type ModalDialogProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  show_close_button?: boolean;
  className?: string;
  content_className?: string;
};

/**
 * Standardized modal dialog component.
 *
 * Provides consistent styling, keyboard handling, and focus management
 * across all modals in the application.
 *
 * @example
 * ```tsx
 * <ModalDialog
 *   open={is_open}
 *   on_open_change={set_is_open}
 *   title="Save Preset"
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={() => set_is_open(false)}>Cancel</Button>
 *       <Button onClick={handle_save}>Save</Button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </ModalDialog>
 * ```
 */
export const ModalDialog = ({
  open,
  on_open_change,
  title,
  description,
  size = "md",
  children,
  footer,
  show_close_button = true,
  className,
  content_className,
}: ModalDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent
        className={cn(
          SIZE_CLASSES[size],
          "p-0 overflow-hidden border-0 shadow-2xl gap-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div className="flex-1 min-w-0">
            <AlertDialogTitle className="text-lg font-semibold truncate">
              {title}
            </AlertDialogTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {show_close_button && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-4 h-8 w-8 shrink-0"
              onClick={() => on_open_change(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>

        {/* Content */}
        <div className={cn("px-6 py-4", content_className)}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            {footer}
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Convenience components for common modal patterns

type ConfirmModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  title: string;
  description: string;
  confirm_label?: string;
  cancel_label?: string;
  on_confirm: () => void;
  loading?: boolean;
  destructive?: boolean;
};

/**
 * Pre-built confirmation modal for destructive or important actions.
 */
export const ConfirmModal = ({
  open,
  on_open_change,
  title,
  description,
  confirm_label = "Confirm",
  cancel_label = "Cancel",
  on_confirm,
  loading = false,
  destructive = false,
}: ConfirmModalProps) => {
  return (
    <ModalDialog
      open={open}
      on_open_change={on_open_change}
      title={title}
      size="sm"
      show_close_button={false}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => on_open_change(false)}
            disabled={loading}
          >
            {cancel_label}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={on_confirm}
            disabled={loading}
          >
            {loading ? "Loading..." : confirm_label}
          </Button>
        </>
      }
    >
      <p className="text-muted-foreground">{description}</p>
    </ModalDialog>
  );
};

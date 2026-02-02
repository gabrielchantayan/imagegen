"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type KeyboardShortcutsModalProps = {
  open: boolean;
  on_close: () => void;
};

type Shortcut = {
  key: string;
  description: string;
};

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { key: "↑ ↓ ← →", description: "Navigate grid" },
  { key: "Enter", description: "Open in detail panel" },
];

const SELECTION_SHORTCUTS: Shortcut[] = [
  { key: "Space", description: "Toggle selection (in select mode)" },
  { key: "Shift + Click", description: "Select range" },
];

const ACTION_SHORTCUTS: Shortcut[] = [
  { key: "S", description: "Toggle favorite" },
  { key: "Delete", description: "Delete image" },
  { key: "C", description: "Compare (2 selected)" },
];

const UI_SHORTCUTS: Shortcut[] = [
  { key: "Escape", description: "Exit mode / close panel" },
  { key: "?", description: "Show this help" },
];

const ShortcutRow = ({ shortcut }: { shortcut: Shortcut }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
    <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs">
      {shortcut.key}
    </kbd>
  </div>
);

const ShortcutSection = ({
  title,
  shortcuts,
}: {
  title: string;
  shortcuts: Shortcut[];
}) => (
  <div>
    <h4 className="text-sm font-medium mb-2">{title}</h4>
    <div className="space-y-1">
      {shortcuts.map((shortcut) => (
        <ShortcutRow key={shortcut.key} shortcut={shortcut} />
      ))}
    </div>
  </div>
);

export const KeyboardShortcutsModal = ({
  open,
  on_close,
}: KeyboardShortcutsModalProps) => {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && on_close()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Keyboard Shortcuts</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <ShortcutSection title="Navigation" shortcuts={NAVIGATION_SHORTCUTS} />
          <Separator />
          <ShortcutSection title="Selection" shortcuts={SELECTION_SHORTCUTS} />
          <Separator />
          <ShortcutSection title="Actions" shortcuts={ACTION_SHORTCUTS} />
          <Separator />
          <ShortcutSection title="Interface" shortcuts={UI_SHORTCUTS} />
        </div>

        <AlertDialogFooter>
          <Button onClick={on_close}>Close</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

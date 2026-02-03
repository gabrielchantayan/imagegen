"use client";

import { ModalDialog } from "@/components/ui/modal-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type KeyboardShortcutsModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  context?: "builder" | "history" | "all";
};

type Shortcut = {
  keys: string[];
  description: string;
};

type ShortcutGroup = {
  title: string;
  context: "builder" | "history" | "global";
  shortcuts: Shortcut[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Builder",
    context: "builder",
    shortcuts: [
      { keys: ["⌘", "Enter"], description: "Generate image" },
      { keys: ["⌘", "S"], description: "Save prompt" },
      { keys: ["⌘", "K"], description: "Search components" },
      { keys: ["⌘", "Z"], description: "Undo" },
      { keys: ["⌘", "⇧", "Z"], description: "Redo" },
    ],
  },
  {
    title: "History Navigation",
    context: "history",
    shortcuts: [
      { keys: ["↑", "↓", "←", "→"], description: "Navigate grid" },
      { keys: ["Enter"], description: "Open selected item" },
      { keys: ["Escape"], description: "Close panel / Exit mode" },
    ],
  },
  {
    title: "History Selection",
    context: "history",
    shortcuts: [
      { keys: ["Space"], description: "Toggle selection (select mode)" },
      { keys: ["Shift", "Click"], description: "Select range" },
    ],
  },
  {
    title: "History Actions",
    context: "history",
    shortcuts: [
      { keys: ["S"], description: "Toggle favorite" },
      { keys: ["Delete"], description: "Delete image" },
      { keys: ["C"], description: "Compare (2 selected)" },
    ],
  },
  {
    title: "Global",
    context: "global",
    shortcuts: [
      { keys: ["⌘", "?"], description: "Show keyboard shortcuts" },
      { keys: ["?"], description: "Show keyboard shortcuts (History)" },
      { keys: ["Escape"], description: "Close modal / panel" },
    ],
  },
];

const KeyBadge = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs border border-border/50">
    {children}
  </kbd>
);

const ShortcutRow = ({ shortcut }: { shortcut: Shortcut }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
    <div className="flex items-center gap-1">
      {shortcut.keys.map((key, i) => (
        <KeyBadge key={i}>{key}</KeyBadge>
      ))}
    </div>
  </div>
);

const ShortcutSection = ({ group }: { group: ShortcutGroup }) => (
  <div>
    <h4 className="text-sm font-medium mb-2 text-foreground">{group.title}</h4>
    <div className="divide-y divide-border/50">
      {group.shortcuts.map((shortcut, i) => (
        <ShortcutRow key={i} shortcut={shortcut} />
      ))}
    </div>
  </div>
);

export const KeyboardShortcutsModal = ({
  open,
  on_open_change,
  context = "all",
}: KeyboardShortcutsModalProps) => {
  const filtered_groups = SHORTCUT_GROUPS.filter((group) => {
    if (context === "all") return true;
    return group.context === context || group.context === "global";
  });

  return (
    <ModalDialog
      open={open}
      on_open_change={on_open_change}
      title="Keyboard Shortcuts"
      description="Quick reference for available shortcuts"
      size="md"
      footer={
        <Button onClick={() => on_open_change(false)}>Close</Button>
      }
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {filtered_groups.map((group, i) => (
          <div key={group.title}>
            {i > 0 && <Separator className="mb-4" />}
            <ShortcutSection group={group} />
          </div>
        ))}
      </div>
    </ModalDialog>
  );
};

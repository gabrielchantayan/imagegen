"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Settings } from "lucide-react";

import { use_builder_store } from "@/lib/stores/builder-store";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "4:3", label: "4:3 (Landscape)" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "16:9", label: "16:9 (Widescreen)" },
] as const;

const RESOLUTIONS = [
  { value: "1080p", label: "1080p" },
  { value: "4K", label: "4K" },
] as const;

const IMAGE_COUNTS = [1, 2, 3, 4] as const;

export const SettingsDropdown = () => {
  const settings = use_builder_store((s) => s.settings);
  const update_settings = use_builder_store((s) => s.update_settings);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground">
        <Settings className="size-4" />
        <span className="sr-only">Settings</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Generation Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Aspect Ratio
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.aspect_ratio}
          onValueChange={(value) =>
            update_settings({
              aspect_ratio: value as typeof settings.aspect_ratio,
            })
          }
        >
          {ASPECT_RATIOS.map((ratio) => (
            <DropdownMenuRadioItem key={ratio.value} value={ratio.value}>
              {ratio.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Resolution
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.resolution}
          onValueChange={(value) =>
            update_settings({ resolution: value as typeof settings.resolution })
          }
        >
          {RESOLUTIONS.map((res) => (
            <DropdownMenuRadioItem key={res.value} value={res.value}>
              {res.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Image Count
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(settings.image_count)}
          onValueChange={(value) =>
            update_settings({ image_count: Number(value) as typeof settings.image_count })
          }
        >
          {IMAGE_COUNTS.map((count) => (
            <DropdownMenuRadioItem key={count} value={String(count)}>
              {count} image{count > 1 ? "s" : ""}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={settings.safety_override}
          onCheckedChange={(checked) => update_settings({ safety_override: checked })}
        >
          Image Safety Override
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={settings.google_search}
          onCheckedChange={(checked) => update_settings({ google_search: checked })}
        >
          Google Search
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Display
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={settings.show_inline_references}
          onCheckedChange={(checked) => update_settings({ show_inline_references: checked })}
        >
          Show Reference Images
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

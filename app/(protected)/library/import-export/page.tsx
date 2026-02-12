'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload } from 'lucide-react';
import { ToolbarSlots } from '@/components/shared/toolbar-slots';

export default function ImportExportPage() {
  const file_input_ref = useRef<HTMLInputElement>(null);
  const [importing, set_importing] = useState(false);
  const [import_result, set_import_result] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [import_mode, set_import_mode] = useState<'merge' | 'replace'>('merge');

  const handle_export = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-builder-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export data. Please try again.');
    }
  };

  const handle_import = async (file: File) => {
    set_importing(true);
    set_import_result(null);

    try {
      const content = await file.text();
      const format = file.name.endsWith('.md') ? 'himd' : 'json';

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format, mode: import_mode }),
      });

      const data = await response.json();

      if (data.success) {
        set_import_result({
          success: true,
          message: `Imported ${data.imported.components} components and ${data.imported.prompts} prompts.${
            data.errors.length > 0 ? ` ${data.errors.length} errors.` : ''
          }`,
        });
      } else {
        set_import_result({
          success: false,
          message: data.error || 'Import failed',
        });
      }
    } catch {
      set_import_result({
        success: false,
        message: 'Failed to read file',
      });
    } finally {
      set_importing(false);
      // Reset file input so same file can be selected again
      if (file_input_ref.current) {
        file_input_ref.current.value = '';
      }
    }
  };

  const left_slot = useMemo(() => (
    <h1 className="text-lg font-semibold">Import / Export</h1>
  ), []);

  return (
    <div className="container py-8">
      <ToolbarSlots left={left_slot} />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Download all components and saved prompts as a JSON file.
            </p>
            <Button onClick={handle_export}>Export All Data</Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Import components from JSON or hi.md files.
            </p>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Import Mode</Label>
                <RadioGroup
                  value={import_mode}
                  onValueChange={(v) => set_import_mode(v as 'merge' | 'replace')}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="font-normal">
                      Merge (add to existing)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="font-normal">
                      Replace (clear existing first)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <input
                ref={file_input_ref}
                type="file"
                accept=".json,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handle_import(file);
                }}
              />

              <Button
                onClick={() => file_input_ref.current?.click()}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Select File'}
              </Button>

              {import_result && (
                <p
                  className={`text-sm ${
                    import_result.success ? 'text-green-600' : 'text-destructive'
                  }`}
                >
                  {import_result.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

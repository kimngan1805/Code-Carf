"use client";
import Editor from "@monaco-editor/react";

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
  readOnly = false,
  height = "320px",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}) {
  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{ minimap: { enabled: false }, readOnly, automaticLayout: true }}
    />
  );
}

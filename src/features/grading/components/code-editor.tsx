"use client";
import Editor from "@monaco-editor/react";

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}) {
  return (
    <Editor
      height="320px"
      language={language}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{ minimap: { enabled: false } }}
    />
  );
}

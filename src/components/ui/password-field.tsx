"use client";

import * as React from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormField } from "./form-field";

export function PasswordField(
  props: Omit<React.ComponentProps<typeof FormField>, "type" | "trailing">,
) {
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <FormField
      icon={LockKeyhole}
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon className="size-[18px]" aria-hidden />
        </button>
      }
    />
  );
}

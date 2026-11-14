"use client";

import { RoleName } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar({
  role = RoleName.STUDENT,
}: {
  role?: RoleName;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu điều hướng"
        aria-controls="mobile-sidebar"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
        onClick={() => {
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <Menu className="size-6" aria-hidden />
      </button>
      <dialog
        ref={dialog}
        id="mobile-sidebar"
        aria-labelledby="mobile-sidebar-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/40 open:flex open:flex-col lg:hidden"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <h2
            id="mobile-sidebar-title"
            className="text-lg font-bold text-primary"
          >
            Code Carf
          </h2>
          <button
            type="button"
            aria-label="Đóng menu điều hướng"
            className="grid size-10 place-items-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => dialog.current?.close()}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav
          aria-label="Điều hướng di động"
          className="flex-1 overflow-y-auto p-4"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a"))
              dialog.current?.close();
          }}
        >
          <SidebarNav role={role} />
        </nav>
      </dialog>
    </>
  );
}

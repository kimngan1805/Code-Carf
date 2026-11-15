"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CodeXml,
  FileText,
  Image as ImageIcon,
  Lock,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";
import { PROVINCES } from "../provinces";
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS,
  teachingLevelOptions,
} from "../rules";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const provinceOptions: ComboboxOption[] = PROVINCES.map((name) => ({
  value: name,
  label: name,
}));

const evidenceExamples = [
  "Thẻ giảng viên hoặc thẻ công tác do trường cấp",
  "Quyết định tuyển dụng, phân công giảng dạy hoặc hợp đồng lao động",
  "Giấy xác nhận công tác có dấu của nhà trường",
  "Ảnh chụp trang hồ sơ giảng viên trên website chính thức của trường",
];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StepHeader({ step, total }: { step: number; total: number }) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6 sm:px-6">
        <span className="flex items-center gap-2.5 text-lg font-bold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CodeXml className="size-5" aria-hidden />
          </span>
          Code Carf
        </span>
        <span className="ml-auto text-sm text-muted-foreground">
          Bước {step}/{total}
        </span>
      </header>
      <div className="mx-auto mt-4 w-full max-w-3xl px-4 sm:px-6">
        <div
          role="progressbar"
          aria-label="Tiến độ hồ sơ giảng viên"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

export function TeacherApplicationForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1); // 1 level, 2 workplace, 3 evidence
  const [level, setLevel] = useState<string | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const [schools, setSchools] = useState<ComboboxOption[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [manualSchool, setManualSchool] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestRef = useRef<AbortController | null>(null);

  // Load the schools for a province at the chosen level.
  function loadSchools(nextProvince: string) {
    requestRef.current?.abort();
    if (!level) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadingSchools(true);
    fetch(
      `/api/schools?province=${encodeURIComponent(nextProvince)}&level=${level}`,
      { signal: controller.signal },
    )
      .then((response) => response.json())
      .then((body: { data: { id: string; name: string }[] | null }) =>
        setSchools(
          (body.data ?? []).map((school) => ({
            value: school.id,
            label: school.name,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => {
        if (requestRef.current === controller) setLoadingSchools(false);
      });
  }

  const schoolName =
    manualSchool ??
    schools.find((school) => school.value === schoolId)?.label ??
    "";
  const canContinue =
    step === 1
      ? Boolean(level)
      : step === 2
        ? Boolean(province) && schoolName.trim().length >= 3
        : files.length > 0;

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_DOCUMENTS) {
        setError(`Chỉ được tải tối đa ${MAX_DOCUMENTS} tệp.`);
        break;
      }
      if (!ACCEPT.split(",").includes(file.type)) {
        setError(`"${file.name}" không phải ảnh JPG, PNG, WEBP hoặc PDF.`);
        continue;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        setError(`"${file.name}" lớn hơn 5 MB.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.set("teachingLevel", level ?? "");
    form.set("province", province ?? "");
    if (schoolId && manualSchool === null) form.set("schoolId", schoolId);
    form.set("schoolName", schoolName);
    files.forEach((file) => form.append("documents", file));
    try {
      const response = await fetch("/api/teacher-applications", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        error: { message: string } | null;
      };
      if (!response.ok) throw new Error(body.error?.message);
      router.replace("/onboarding/teacher/submitted");
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : "Không gửi được hồ sơ, vui lòng thử lại.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-accent/10 via-background to-background">
      <StepHeader step={step + 1} total={4} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-accent-strong">
          Hồ sơ giảng viên
        </p>

        {step === 1 && (
          <>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Bạn đang giảng dạy ở cấp nào?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Code Carf hiện nhận giảng viên từ bậc Trung học phổ thông trở lên.
            </p>
            <div
              role="radiogroup"
              aria-label="Cấp giảng dạy"
              className="mt-8 grid gap-3 sm:grid-cols-3"
            >
              {teachingLevelOptions.map((option) => {
                const selected = level === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      if (level === option.value) return;
                      setLevel(option.value);
                      setProvince(null);
                      setSchools([]);
                      setSchoolId(null);
                      setManualSchool(null);
                    }}
                    className={cn(
                      "rounded-2xl border bg-background p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-secondary/30 ring-4 ring-highlight/15"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className="block font-semibold">{option.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {["Tiểu học", "Trung học cơ sở"].map((label) => (
                <div
                  key={label}
                  aria-disabled
                  className="flex items-center justify-between rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                >
                  {label}
                  <span className="text-xs">Chưa hỗ trợ</span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Bạn đang công tác ở đâu?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Chọn tỉnh/thành rồi tìm trường trong danh sách.
            </p>
            <div className="mt-8 space-y-5">
              <Combobox
                id="province"
                label="Tỉnh / thành phố"
                placeholder="Gõ để tìm, ví dụ: Đà Nẵng"
                options={provinceOptions}
                value={province}
                onChange={(value) => {
                  setProvince(value);
                  setSchools([]);
                  setSchoolId(null);
                  setManualSchool(null);
                  loadSchools(value);
                }}
              />
              {manualSchool === null ? (
                <Combobox
                  id="school"
                  label="Trường công tác"
                  placeholder={
                    !province
                      ? "Chọn tỉnh/thành trước"
                      : loadingSchools
                        ? "Đang tải danh sách trường..."
                        : "Gõ tên trường để tìm"
                  }
                  options={schools}
                  value={schoolId}
                  onChange={setSchoolId}
                  disabled={!province || loadingSchools}
                  emptyText="Không tìm thấy trường phù hợp"
                  footer={
                    <button
                      type="button"
                      onClick={() => {
                        setManualSchool("");
                        setSchoolId(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
                    >
                      <Pencil className="size-4" aria-hidden />
                      Trường của tôi không có trong danh sách
                    </button>
                  }
                />
              ) : (
                <div>
                  <FormField
                    id="manual-school"
                    label="Tên trường công tác"
                    placeholder="Ghi đầy đủ, ví dụ: Trường Đại học ..."
                    value={manualSchool}
                    onChange={(event) => setManualSchool(event.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setManualSchool(null)}
                    className="mt-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Chọn từ danh sách
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Tải lên minh chứng giảng viên
            </h1>
            <p className="mt-2 text-muted-foreground">
              Giấy tờ cho thấy bạn đang giảng dạy tại{" "}
              <span className="font-semibold text-foreground">
                {schoolName}
              </span>
              .
            </p>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInput.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              className={cn(
                "mt-8 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging
                  ? "border-primary bg-secondary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary/60 text-primary">
                <Upload className="size-6" aria-hidden />
              </span>
              <p className="mt-3 font-semibold">
                Kéo thả tệp vào đây hoặc bấm để chọn
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                JPG, PNG, WEBP hoặc PDF · tối đa {MAX_DOCUMENTS} tệp, mỗi tệp 5
                MB
              </p>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background px-4 py-3"
                  >
                    {file.type === "application/pdf" ? (
                      <FileText
                        className="size-5 text-accent-strong"
                        aria-hidden
                      />
                    ) : (
                      <ImageIcon className="size-5 text-primary" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Bỏ ${file.name}`}
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 rounded-2xl bg-muted/60 p-4 text-sm">
              <p className="font-semibold">
                Có thể dùng một trong các giấy tờ:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {evidenceExamples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2 text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                Tệp chỉ dùng để xét duyệt và không công khai. Bạn có thể che số
                CCCD hoặc thông tin không liên quan trước khi tải lên.
              </p>
            </div>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-10">
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            onClick={() => (step === 1 ? onBack() : setStep(step - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Quay lại
          </Button>
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              disabled={!canContinue}
              onClick={() => {
                setError(null);
                setStep(step + 1);
              }}
              className="rounded-xl px-6"
            >
              Tiếp tục
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={!canContinue || submitting}
              onClick={submit}
              className="rounded-xl px-6 shadow-lg shadow-primary/25"
            >
              {submitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

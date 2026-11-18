import Form from "next/form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_MAX_LENGTH } from "../query";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form
      action="/hv/search"
      role="search"
      className="flex min-w-0 items-center gap-2"
    >
      <Input
        name="q"
        type="search"
        aria-label="Tìm lộ trình, bài học, cuộc thi"
        placeholder="Tìm lộ trình, bài học, cuộc thi..."
        defaultValue={defaultValue}
        maxLength={SEARCH_MAX_LENGTH}
        className="h-10 w-full min-w-0 rounded-full border border-border/80 bg-muted/50 px-4 text-sm focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none"
      />
      <Button
        type="submit"
        aria-label="Tìm kiếm"
        size="icon"
        className="shrink-0 rounded-full"
      >
        <Search className="size-4" aria-hidden />
      </Button>
    </Form>
  );
}

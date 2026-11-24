# Design system

All colors, fonts, and radii are defined once in `src/app/globals.css` and exposed as Tailwind classes. Components use **semantic tokens**, never raw hex values or Tailwind's default palette (`bg-red-500`, `text-neutral-700`). A test (`src/lib/design-tokens.test.ts`) fails CI if a raw color appears in `src`.

## Brand palette

| Token (class suffix) | Hex       | Use                                              |
| -------------------- | --------- | ------------------------------------------------ |
| `brand-blue`         | `#004DA9` | Main brand color: headings, primary buttons, nav |
| `brand-sky`          | `#12AFFF` | Highlights, focus rings, progress bars, icons    |
| `brand-sky-light`    | `#A3E3FA` | Soft backgrounds, secondary buttons, cards       |
| `brand-orange`       | `#F66625` | Call to action, badges, decorative shapes        |
| `brand-gray`         | `#737373` | Secondary text                                   |
| `brand-gray-light`   | `#D9D9D9` | Borders, dividers, inputs                        |

`bg-brand-*` / `text-brand-*` classes exist for illustrations and marketing sections only. In app UI, use the semantic tokens below.

The `--map-*` variables are the illustration palette of the contest island map (sea, sand, grass, stone, wood...). SVG drawings reference them as `fill="var(--map-sand)"`; do not use them anywhere else.

The `--format-*` variables give each contest format (solo, duel, team, ranked, friendly, tournament, daily, classroom) its own tint. Contest cards and the format tabs set `--tint` to one of them and use `text-(--tint)`, `bg-(--tint)/10` and so on.

## Semantic tokens

| Class                                        | Value                  | When to use                                  |
| -------------------------------------------- | ---------------------- | -------------------------------------------- |
| `bg-background` / `text-foreground`          | white / `#1A1A1A`      | Page background and body text                |
| `bg-primary` / `text-primary-foreground`     | brand-blue / white     | Main action, active nav, links, headings     |
| `bg-secondary` / `text-secondary-foreground` | brand-sky-light / blue | Secondary action, selected card, soft panels |
| `bg-accent`                                  | brand-orange           | Decoration: badges, icons, large shapes      |
| `bg-accent-strong` / `text-accent-strong`    | `#C4501A`              | Orange buttons and orange text               |
| `text-highlight` / `bg-highlight`            | brand-sky              | Progress bars, XP, icons, never body text    |
| `bg-muted` / `text-muted-foreground`         | `#F4F4F4` / brand-gray | Subtle panels, captions, helper text         |
| `border-border` / `border-input`             | brand-gray-light       | Borders (applied by default to every border) |
| `ring` / outline                             | brand-sky              | Focus indicator                              |
| `bg-success`, `bg-warning`, `bg-destructive` | green / amber / red    | Submission status, alerts, form errors       |

Each `bg-*` token has a matching `*-foreground` for text placed on it, and hover shades where needed (`hover:bg-primary-hover`).

### Contrast rules

Checked against WCAG AA (4.5:1 for normal text):

- White on `brand-orange` is only 3.07:1, so filled orange buttons and orange text use `accent-strong` (4.66:1). Plain `brand-orange` is fine for icons, shapes, and text of at least 24px.
- `brand-sky` on white is 2.44:1. Never use it for text; use it for rings, bars, and icons.
- `brand-blue` on white (7.97:1) and `brand-gray` on white (4.74:1) are safe for any text.

## Typography

Montserrat (Latin and Vietnamese subsets) is loaded with `next/font` in `src/app/layout.tsx` and is the default `font-sans`. Use weights for hierarchy: `font-bold` for headings, `font-semibold` for buttons and labels, normal for body text.

## Components

Shared primitives live in `src/components/ui` (shadcn style, `cva` variants). Use them instead of styling raw elements:

```tsx
import { Button } from "@/components/ui/button";

<Button>Nộp bài</Button>                       // primary
<Button variant="secondary">Xem gợi ý</Button>
<Button variant="accent">Tham gia cuộc thi</Button>
<Button variant="outline">Hủy</Button>
<Button variant="ghost" size="sm">Chi tiết</Button>
<Button variant="destructive">Xóa</Button>
<Button asChild><Link href="/hv/paths">Bắt đầu học</Link></Button>
```

## Rules for the team

1. Use semantic tokens (`bg-primary`, `text-muted-foreground`), not `bg-brand-*`, unless you are drawing an illustration.
2. Never write hex values or Tailwind palette colors in components. If a color is missing, add a token to `globals.css` and to this document in the same PR.
3. Build new reusable pieces in `src/components/ui` with `cva` variants; feature-specific UI goes in `src/features/<module>/components`.
4. Merge class names with `cn()` from `@/lib/utils` so callers can override styles.
5. Check focus states: interactive elements must show the `ring` outline when focused with the keyboard.

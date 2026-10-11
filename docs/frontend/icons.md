# Icons — HugeIcons ONLY

**Policy: the only allowed icon set is HugeIcons (https://hugeicons.com/icons). No other icon libraries** (lucide-react, heroicons, etc.) — `lucide-react` was removed from the repo and should not be reintroduced.

## Packages

- `@hugeicons/core-free-icons` — icon objects (e.g. `BanknoteIcon`, `InvoiceIcon`, `Analytics01Icon`, `EyeIcon`, `EyeOffIcon`, `LoaderIcon`, `CheckIcon`)
- `@hugeicons/react` — `HugeiconsIcon` renderer (pure SVG, no hooks; works in server components)

## Usage pattern

```tsx
import { BanknoteIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

<HugeiconsIcon icon={BanknoteIcon} size={20} strokeWidth={1.5} />
```

`size` and `strokeWidth` control rendering; `className` (e.g. `animate-spin`) and standard SVG props apply too.

## Finding icon names

The package exposes thousands of icons as `<Name>Icon` exports. To find one, list names in the installed package:

```sh
ls node_modules/.pnpm/@hugeicons+core-free-icons@*/node_modules/@hugeicons/core-free-icons/dist/types | sed 's/Icon.d.ts//'
```

## Current icon usage

- Login form: `EyeIcon`/`EyeOffIcon` (password visibility toggle), `LoaderIcon` (submit spinner)
- Hero panel (`lib/data/promo.ts`): `BanknoteIcon`, `InvoiceIcon`, `Analytics01Icon`
- Checkbox: `CheckIcon`
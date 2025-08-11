import type {CardLine} from "../models/MTG.ts";

export function cardLine(line: string): CardLine {
    // Example input:
    // "1x Example Card (set) 123 *F* [Example category] ^Buy,#0066ff^"
    let s = (line ?? "").trim();

    const result: CardLine = {
        name: "",
    };

    // 1) Count at the beginning: "<number>x " or "<number> "
    //    e.g., "1x ", "2 "
    {
        const m = s.match(/^\s*(\d+)\s*x?\s+/i);
        if (m) {
            result.count = parseInt(m[1] ?? "", 10);
            s = s.slice(m[0].length);
        }
    }

    // 2) Color tag data: ^...^ (take the last occurrence if multiple; remove all)
    {
        const colorTagMatches = [...s.matchAll(/\^([^^]*)\^/g)];
        if (colorTagMatches.length > 0) {
            result.colorTagData = colorTagMatches.at(-1)![1]?.trim();
            s = s.replace(/\^([^^]*)\^/g, "").trim();
        }
    }

    // 3) Categories: [cat1, cat2] (collect all; remove from string)
    {
        const categories: string[] = [];
        s = s.replace(/\[([^\]]+)]/g, (_full, inner: string) => {
            inner.split(",").forEach((c) => {
                const t = c.trim();
                if (t.length) categories.push(t);
            });
            return "";
        });
        if (categories.length) result.categories = categories;
        s = s.trim();
    }

    // 4) Foil marker: *F* (case-insensitive; remove all)
    {
        if (/\*F\*/i.test(s)) {
            result.foil = true;
            s = s.replace(/\*F\*/gi, "").trim();
        }
    }

    // 5) Set in parentheses: (set). Take the last (...) occurrence.
    //    Remove only that last one from the working string.
    {
        const setMatches = [...s.matchAll(/\(([^)]+)\)/g)];
        if (setMatches.length > 0) {
            const last = setMatches.at(-1)!;
            result.set = last[1]?.trim();

            // Remove only the last occurrence using its index
            const idx = (last as any).index as number;
            const before = s.slice(0, idx);
            const after = s.slice(idx + last[0].length);
            s = (before + after).trim();
        }
    }

    // 6) Collector number: pick the last collector number token (number with optional suffix); remove that one.
    {
        // Match collector numbers like "123", "204d", "75p", etc.
        const collectorMatches = [...s.matchAll(/\b(\d+[a-z]?)\b/gi)];
        if (collectorMatches.length > 0) {
            const lastCollector = collectorMatches.at(-1)!;
            result.collectorNumber = lastCollector[1]?.trim();

            // Remove only this occurrence using its index
            const idx = (lastCollector as any).index as number;
            const before = s.slice(0, idx);
            const after = s.slice(idx + lastCollector[0].length);
            s = (before + after).trim();
        }
    }

    // 7) Remaining text is the card name
    result.name = s.replace(/\s{2,}/g, " ").trim();

    return result;
}
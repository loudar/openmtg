import {Container, Graphics} from "pixi.js";

export function drawDashedRoundedRect(content: Container, x: number, y: number, w: number, h: number, r: number, color: number, width: number, dash: number, gap: number) {
    const edges = [
        {x1: x + r, y1: y, x2: x + w - r, y2: y},
        {x1: x + w, y1: y + r, x2: x + w, y2: y + h - r},
        {x1: x + w - r, y1: y + h, x2: x + r, y2: y + h},
        {x1: x, y1: y + h - r, x2: x, y2: y + r},
    ];

    const drawSegment = (x1: number, y1: number, x2: number, y2: number) => {
        const total = Math.hypot(x2 - x1, y2 - y1);
        const dx = (x2 - x1) / total;
        const dy = (y2 - y1) / total;
        let drawn = 0;
        while (drawn < total) {
            const seg = Math.min(dash, total - drawn);
            const sx = x1 + dx * drawn;
            const sy = y1 + dy * drawn;
            const ex = x1 + dx * (drawn + seg);
            const ey = y1 + dy * (drawn + seg);
            const g = new Graphics();
            g.moveTo(sx, sy).lineTo(ex, ey).stroke({color, width});
            content.addChild(g);
            drawn += dash + gap;
        }
    };

    // straight edges
    edges.forEach((e) => drawSegment(e.x1, e.y1, e.x2, e.y2));

    // approximate dashed corners with short arc dashes (very light approx)
    const arc = (cx: number, cy: number, start: number, end: number) => {
        const circumference = r * (end - start);
        const steps = Math.max(3, Math.floor(circumference / (dash + gap)));
        for (let i = 0; i < steps; i++) {
            const a1 = start + (i * (end - start)) / steps;
            const a2 = start + ((i + 0.5) * (end - start)) / steps; // half-length dash
            const sx = cx + Math.cos(a1) * r;
            const sy = cy + Math.sin(a1) * r;
            const ex = cx + Math.cos(a2) * r;
            const ey = cy + Math.sin(a2) * r;
            const g = new Graphics();
            g.moveTo(sx, sy).lineTo(ex, ey).stroke({color, width});
            content.addChild(g);
        }
    };

    // corners centers
    arc(x + w - r, y + r, -Math.PI / 2, 0); // top-right
    arc(x + w - r, y + h - r, 0, Math.PI / 2); // bottom-right
    arc(x + r, y + h - r, Math.PI / 2, Math.PI); // bottom-left
    arc(x + r, y + r, Math.PI, (3 * Math.PI) / 2); // top-left
}
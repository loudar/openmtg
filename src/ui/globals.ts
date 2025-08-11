let _cardSize = 2;
const _listeners: Array<(v: number) => void> = [];

export function getCardSize(): number {
    return _cardSize;
}

export function setCardSize(v: number): void {
    if (typeof v !== "number" || !isFinite(v) || v <= 0) {
        return;
    }
    _cardSize = v;
    for (const l of _listeners) {
        try {
            l(_cardSize);
        } catch {
            // ignore listener errors
        }
    }
}

export function onCardSizeChange(listener: (v: number) => void): () => void {
    _listeners.push(listener);
    return () => {
        const idx = _listeners.indexOf(listener);
        if (idx >= 0) {
            _listeners.splice(idx, 1);
        }
    };
}

export const CARD_WIDTH = 80;
export const CARD_HEIGHT = 110;
export const MARGIN = 30;
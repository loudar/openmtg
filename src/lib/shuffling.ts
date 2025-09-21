export function fisherYatesShuffle<T>(input: T[]): T[] {
    // Fisher–Yates shuffle on a copy to avoid mutating the input
    const arr = input.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i]!;
        arr[i] = arr[j]!;
        arr[j] = tmp;
    }

    return arr;
}
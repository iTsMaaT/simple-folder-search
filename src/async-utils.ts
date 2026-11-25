/** Limits how many async operations run at once. */
export function createLimiter(max: number) {
    let active = 0;
    const waiting: (() => void)[] = [];

    return async <T>(fn: () => Promise<T>): Promise<T> => {
        if (active >= max) await new Promise<void>(resolve => waiting.push(resolve));
        else active++;
        try {
            return await fn();
        } finally {
            // Hand the slot directly to the next waiter so `active` never exceeds `max`.
            const next = waiting.shift();
            if (next) next();
            else active--;
        }
    };
}

export function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) throw signal.reason ?? new Error("The operation was aborted.");
}

export function yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
}

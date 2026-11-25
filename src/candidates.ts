import path from "node:path";
import type { ScanOptions, SearchCandidate } from "./types";
import { throwIfAborted, yieldToEventLoop } from "./async-utils";
import { matchExtension } from "./extensions";

/** Turns file paths into search candidates (name without extension + parent folder name). */
export async function toCandidates(files: string[], extensions: string[], options: ScanOptions): Promise<SearchCandidate[]> {
    const { batchSize = 100, signal } = options;
    const candidates: SearchCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
        if (i > 0 && i % batchSize === 0) {
            await yieldToEventLoop();
            throwIfAborted(signal);
        }
        const file = files[i];
        const base = path.basename(file);
        const ext = matchExtension(base, extensions);
        const folder = path.basename(path.dirname(file));
        candidates.push({
            name: ext ? base.slice(0, base.length - ext.length) : path.parse(file).name,
            folder,
            artist: folder,
            path: file,
        });
    }
    return candidates;
}

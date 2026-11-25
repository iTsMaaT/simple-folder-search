import Fuse, { type Expression } from "fuse.js";
import type { MatcherOptions, QueryOptions, SearchCandidate, SearchQuery, SearchResult } from "./types";

export const DEFAULT_MINIMUM_SCORE = 0.6;

export interface Matcher {
    candidates: SearchCandidate[];
    search(search: SearchQuery, options: QueryOptions): string[] | SearchResult[];
}

/**
 * Builds the Fuse index once; each query then gets a lightweight Fuse instance
 * (sharing that index) configured with the query's own threshold.
 */
export function createMatcher(candidates: SearchCandidate[], options: MatcherOptions): Matcher {
    const { weights = {}, ignoreLocation = true, fuseOptions = {} } = options;
    const nameWeight = weights.name ?? 2;
    const folderWeight = weights.folder ?? 1;
    const keys = fuseOptions.keys ?? [
        { name: "name", weight: nameWeight },
        { name: "folder", weight: folderWeight },
    ];
    const index = Fuse.createIndex(keys, candidates, fuseOptions.getFn ? { getFn: fuseOptions.getFn } : undefined);

    const fuseFor = (minimumScore: number) => new Fuse(candidates, {
        includeScore: true,
        ignoreLocation,
        threshold: 1 - minimumScore,
        ...fuseOptions,
        keys,
    }, index);

    return {
        candidates,
        search(search, queryOptions) {
            const { minimumScore = DEFAULT_MINIMUM_SCORE, limit = Infinity, includeScores = false } = queryOptions;
            const query = parseQuery(search);
            const maxFuseScore = 1 - minimumScore;
            let results: SearchResult[];

            if (query === null) {
                // Empty query: every candidate matches.
                results = candidates.slice(0, limit).map(c => toResult(c, 0));
            } else if (typeof query === "string" || query.name === undefined || query.folder === undefined) {
                // Single query, scored by Fuse. Fuse's `threshold` is applied per field while the final
                // score combines fields, so filter on it too. Results are sorted best-first.
                const expression: string | Expression = typeof query === "string"
                    ? query
                    : query.name !== undefined ? { name: query.name } : { folder: query.folder as string };
                const found = Number.isFinite(limit)
                    ? fuseFor(minimumScore).search(expression, { limit })
                    : fuseFor(minimumScore).search(expression);
                results = found
                    .filter(r => (r.score ?? 0) <= maxFuseScore)
                    .map(r => toResult(r.item, r.score ?? 0));
            } else {
                // Name + folder. Fuse multiplies field scores together, so one exact field would hide
                // a poor match on the other; use a weighted average of both field scores instead.
                const fuse = fuseFor(minimumScore);
                const folderScores = new Map<number, number>();
                for (const r of fuse.search({ folder: query.folder })) folderScores.set(r.refIndex, r.score ?? 0);

                const combined: { item: SearchCandidate; refIndex: number; score: number }[] = [];
                for (const r of fuse.search({ name: query.name })) {
                    const folderScore = folderScores.get(r.refIndex);
                    if (folderScore === undefined) continue;
                    const score = (nameWeight * (r.score ?? 0) + folderWeight * folderScore) / (nameWeight + folderWeight);
                    if (score <= maxFuseScore) combined.push({ item: r.item, refIndex: r.refIndex, score });
                }
                combined.sort((a, b) => a.score - b.score || a.refIndex - b.refIndex);
                results = combined.map(r => toResult(r.item, r.score));
            }

            results = results.slice(0, limit);
            return includeScores ? results : results.map(r => r.path);
        },
    };
}

/** Converts a Fuse score (0 = perfect) into a similarity (1 = perfect). */
function toResult(candidate: SearchCandidate, fuseScore: number): SearchResult {
    return {
        path: candidate.path,
        score: Math.round((1 - fuseScore) * 1e6) / 1e6,
        name: candidate.name,
        folder: candidate.folder,
    };
}

/** Normalizes a user query; returns `null` when it is empty. */
function parseQuery(search: SearchQuery): string | { name?: string; folder?: string } | null {
    let name: string | undefined;
    let folder: string | undefined;

    if (typeof search === "string") return search.trim() === "" ? null : search;
    if (Array.isArray(search)) {
        [name, folder] = search;
    } else {
        name = search.name;
        folder = search.folder ?? search.artist;
    }

    name = name?.trim() ? name : undefined;
    folder = folder?.trim() ? folder : undefined;
    if (name === undefined && folder === undefined) return null;
    return { name, folder };
}

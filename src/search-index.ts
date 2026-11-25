import type { QueryOptions, SearchIndex, SearchOptions, SearchQuery, SearchResult } from "./types";
import { toCandidates } from "./candidates";
import { normalizeExtensions } from "./extensions";
import { createMatcher } from "./matcher";
import { scanFiles } from "./scan";
import { resolveDirectory, validateOptions, validateQuery } from "./validation";

/**
 * Scan a folder once and return a reusable index, so repeated searches don't re-read the disk
 * or rebuild the fuzzy index. Call `refresh()` when the folder changes.
 *
 * @param filepath - The directory to index.
 * @param fileExtensions - File extensions to include (case-insensitive, leading dot optional). Empty = all files.
 * @param options - Scan / matcher options, plus default query options for every `search()` call.
 */
export async function createSearchIndex(
    filepath: string,
    fileExtensions: string[] = [],
    options: SearchOptions = {},
): Promise<SearchIndex> {
    if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
    validateOptions(options);

    const root = await resolveDirectory(filepath);
    const extensions = normalizeExtensions(fileExtensions);
    let files: string[] = [];
    let matcher = createMatcher([], options);

    const refresh = async () => {
        const scanned = await scanFiles(root, fileExtensions, options);
        const candidates = await toCandidates(scanned, extensions, options);
        // Swap both at once so a failed refresh leaves the previous index usable.
        files = scanned;
        matcher = createMatcher(candidates, options);
    };
    await refresh();

    function searchIndex(query: SearchQuery, queryOptions: QueryOptions & { includeScores: true }): SearchResult[];
    function searchIndex(query: SearchQuery, queryOptions?: QueryOptions): string[];
    function searchIndex(query: SearchQuery, queryOptions: QueryOptions = {}): string[] | SearchResult[] {
        const merged = { ...options, ...queryOptions };
        validateQuery(query);
        validateOptions(merged);
        return matcher.search(query, merged);
    }

    return {
        root,
        get files() {
            return files;
        },
        get size() {
            return files.length;
        },
        search: searchIndex,
        refresh,
    };
}

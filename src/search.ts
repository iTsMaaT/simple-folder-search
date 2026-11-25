import type {
    CacheCallback,
    MatcherOptions,
    QueryOptions,
    SearchCandidate,
    SearchOptions,
    SearchQuery,
    SearchResult,
    SimpleFolderSearchParams,
} from "./types";
import { throwIfAborted } from "./async-utils";
import { toCandidates } from "./candidates";
import { normalizeExtensions } from "./extensions";
import { createMatcher } from "./matcher";
import { scanFiles } from "./scan";
import { resolveDirectory, validateOptions, validateQuery } from "./validation";

/**
 * Fuzzy-search a folder (recursively) by file name and, optionally, parent folder name.
 *
 * @param filepath - The directory to search in.
 * @param fileExtensions - File extensions to include (case-insensitive, leading dot optional). Empty = all files.
 * @param search - The query: a string, a `[name, folder]` tuple or `{ name, folder }`. Empty = every file.
 * @param options - Optional search options.
 * @param cacheCallback - Optional custom file provider used instead of scanning the folder.
 * @returns The matching file paths, best match first (or {@link SearchResult}s with `includeScores`).
 */
export function simpleFolderSearch(
    filepath: string,
    fileExtensions: string[],
    search: SearchQuery,
    options: SearchOptions & { includeScores: true },
    cacheCallback?: CacheCallback,
): Promise<SearchResult[]>;
export function simpleFolderSearch(
    filepath: string,
    fileExtensions: string[],
    search: SearchQuery,
    options?: SearchOptions,
    cacheCallback?: CacheCallback,
): Promise<string[]>;
export function simpleFolderSearch(params: SimpleFolderSearchParams & { includeScores: true }): Promise<SearchResult[]>;
export function simpleFolderSearch(params: SimpleFolderSearchParams): Promise<string[]>;
export async function simpleFolderSearch(
    filepathOrParams: string | SimpleFolderSearchParams,
    fileExtensions: string[] = [],
    search: SearchQuery = "",
    options: SearchOptions = {},
    cacheCallback?: CacheCallback,
): Promise<string[] | SearchResult[]> {
    let filepath: string;
    if (typeof filepathOrParams === "object" && filepathOrParams !== null) {
        const { path: dir, extensions = [], query = "", cache, ...rest } = filepathOrParams;
        filepath = dir;
        fileExtensions = extensions;
        search = query;
        options = rest;
        cacheCallback = cache;
    } else {
        filepath = filepathOrParams;
    }

    if (typeof filepath !== "string") throw new Error("Filepath must be a string.");
    if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
    validateQuery(search);
    validateOptions(options);

    const absolutePath = await resolveDirectory(filepath);
    const extensions = normalizeExtensions(fileExtensions);

    const files = cacheCallback
        ? await cacheCallback(absolutePath, fileExtensions, search)
        : await scanFiles(absolutePath, fileExtensions, options);
    throwIfAborted(options.signal);

    const candidates = await toCandidates(files, extensions, options);
    return createMatcher(candidates, options).search(search, options);
}

/**
 * Fuzzy-search a list of candidates.
 *
 * @param candidates - The candidates (`{ name, folder?, path }`; `artist` is accepted as an alias of `folder`).
 * @param search - The query: a string, a `[name, folder]` tuple or `{ name, folder }`. Empty = every candidate.
 * @param minimumScore - Minimum similarity (0–1) for a candidate to match. Default `0.6`.
 * @param options - Optional matcher / query options.
 */
export function searchCandidates(
    candidates: SearchCandidate[],
    search: SearchQuery,
    minimumScore: number | undefined,
    options: MatcherOptions & QueryOptions & { includeScores: true },
): Promise<SearchResult[]>;
export function searchCandidates(
    candidates: SearchCandidate[],
    search: SearchQuery,
    minimumScore?: number,
    options?: MatcherOptions & QueryOptions,
): Promise<string[]>;
export async function searchCandidates(
    candidates: SearchCandidate[],
    search: SearchQuery,
    minimumScore?: number,
    options: MatcherOptions & QueryOptions = {},
): Promise<string[] | SearchResult[]> {
    if (!Array.isArray(candidates)) throw new Error("Candidates must be an array.");
    const merged = { ...options, minimumScore: minimumScore ?? options.minimumScore };
    validateQuery(search);
    validateOptions(merged);

    const normalized = candidates.map(c => ({ ...c, folder: c.folder ?? c.artist }));
    return createMatcher(normalized, merged).search(search, merged);
}

import { IFuseOptions } from 'fuse.js';

/**
 * Custom file provider. When given, the folder is not scanned: the returned paths are used as-is
 * (they are not re-filtered by extension, so filter them yourself if needed).
 */
type CacheCallback = (filePath: string, fileExtensions: string[], search?: SearchQuery) => Promise<string[]>;
/**
 * A search query:
 * - a string, matched against both the file name and its parent folder name
 * - a `[name, folder?]` tuple
 * - an object with `name` and/or `folder` (`artist` is accepted as an alias of `folder`)
 */
type SearchQuery = string | string[] | {
    name?: string;
    folder?: string;
    artist?: string;
};
/** A rule deciding whether a file or folder is skipped during the scan. */
type IgnoreRule = string | RegExp | ((filePath: string, isDirectory: boolean) => boolean);
/** Options controlling how the folder is scanned. */
interface ScanOptions {
    /** Number of directory entries / files processed before yielding to the event loop. Default `100`. */
    batchSize?: number;
    /** Maximum number of directories read concurrently. Default `1`. */
    parallelSearches?: number;
    /** How many folder levels below the root to descend into. `0` = root only. Default `Infinity`. */
    maxDepth?: number;
    /** Files or folders to skip (glob string, RegExp or predicate). */
    ignore?: IgnoreRule | IgnoreRule[];
    /** Skip files and folders whose name starts with a dot. Default `false`. */
    ignoreHidden?: boolean;
    /** Descend into symlinked folders (symlinked files are always included). Default `false`. */
    followSymlinks?: boolean;
    /** Abort the scan / search. The returned promise rejects with `signal.reason`. */
    signal?: AbortSignal;
    /** Called when a sub-folder cannot be read. Unreadable sub-folders are skipped either way. */
    onError?: (error: unknown, filePath: string) => void;
}
/** Options controlling how the fuzzy matcher is configured. */
interface MatcherOptions {
    /** Relative importance of the file name vs. the parent folder name. Default `{ name: 2, folder: 1 }`. */
    weights?: {
        name?: number;
        folder?: number;
    };
    /** Match the query anywhere in the name instead of near its start. Default `true`. */
    ignoreLocation?: boolean;
    /** Raw Fuse.js options, merged over the defaults. */
    fuseOptions?: IFuseOptions<SearchCandidate>;
}
/** Options applied to a single search. */
interface QueryOptions {
    /** Minimum similarity (0–1, higher = stricter) for a file to match. Default `0.6`. */
    minimumScore?: number;
    /** Maximum number of results. Default: no limit. */
    limit?: number;
    /** Return `{ path, score, name, folder }` objects instead of plain paths. Default `false`. */
    includeScores?: boolean;
}
interface SearchOptions extends ScanOptions, MatcherOptions, QueryOptions {
}
/** Object form of the {@link simpleFolderSearch} arguments. */
interface SimpleFolderSearchParams extends SearchOptions {
    /** The directory to search in. */
    path: string;
    /** File extensions to include (case-insensitive, leading dot optional). Empty = all files. */
    extensions?: string[];
    /** The search query. Empty = return every file. */
    query?: SearchQuery;
    /** Optional custom file provider, see {@link CacheCallback}. */
    cache?: CacheCallback;
}
/** A file prepared for fuzzy matching. */
interface SearchCandidate {
    /** File name without extension. */
    name: string;
    /** Parent folder name. */
    folder?: string;
    /** @deprecated Alias of `folder`, kept for backward compatibility. */
    artist?: string;
    /** Full file path. */
    path: string;
}
interface SearchResult {
    /** Full file path. */
    path: string;
    /** Similarity between 0 and 1, higher is better (comparable to `minimumScore`). */
    score: number;
    /** File name without extension. */
    name: string;
    /** Parent folder name. */
    folder?: string;
}
/** A reusable, pre-scanned index. See {@link createSearchIndex}. */
interface SearchIndex {
    /** Absolute path of the indexed folder. */
    readonly root: string;
    /** Indexed file paths, sorted. */
    readonly files: readonly string[];
    /** Number of indexed files. */
    readonly size: number;
    search(query: SearchQuery, options: QueryOptions & {
        includeScores: true;
    }): SearchResult[];
    search(query: SearchQuery, options?: QueryOptions): string[];
    /** Re-scan the folder and rebuild the index. */
    refresh(): Promise<void>;
}

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
declare function simpleFolderSearch(filepath: string, fileExtensions: string[], search: SearchQuery, options: SearchOptions & {
    includeScores: true;
}, cacheCallback?: CacheCallback): Promise<SearchResult[]>;
declare function simpleFolderSearch(filepath: string, fileExtensions: string[], search: SearchQuery, options?: SearchOptions, cacheCallback?: CacheCallback): Promise<string[]>;
declare function simpleFolderSearch(params: SimpleFolderSearchParams & {
    includeScores: true;
}): Promise<SearchResult[]>;
declare function simpleFolderSearch(params: SimpleFolderSearchParams): Promise<string[]>;
/**
 * Fuzzy-search a list of candidates.
 *
 * @param candidates - The candidates (`{ name, folder?, path }`; `artist` is accepted as an alias of `folder`).
 * @param search - The query: a string, a `[name, folder]` tuple or `{ name, folder }`. Empty = every candidate.
 * @param minimumScore - Minimum similarity (0–1) for a candidate to match. Default `0.6`.
 * @param options - Optional matcher / query options.
 */
declare function searchCandidates(candidates: SearchCandidate[], search: SearchQuery, minimumScore: number | undefined, options: MatcherOptions & QueryOptions & {
    includeScores: true;
}): Promise<SearchResult[]>;
declare function searchCandidates(candidates: SearchCandidate[], search: SearchQuery, minimumScore?: number, options?: MatcherOptions & QueryOptions): Promise<string[]>;

/**
 * Scan a folder once and return a reusable index, so repeated searches don't re-read the disk
 * or rebuild the fuzzy index. Call `refresh()` when the folder changes.
 *
 * @param filepath - The directory to index.
 * @param fileExtensions - File extensions to include (case-insensitive, leading dot optional). Empty = all files.
 * @param options - Scan / matcher options, plus default query options for every `search()` call.
 */
declare function createSearchIndex(filepath: string, fileExtensions?: string[], options?: SearchOptions): Promise<SearchIndex>;

/**
 * Recursively list the files of a folder matching the given extensions.
 * Useful as a building block for a {@link CacheCallback}.
 *
 * @returns Absolute file paths, sorted.
 */
declare function scanFiles(filepath: string, fileExtensions?: string[], options?: ScanOptions): Promise<string[]>;

export { type CacheCallback, type IgnoreRule, type MatcherOptions, type QueryOptions, type ScanOptions, type SearchCandidate, type SearchIndex, type SearchOptions, type SearchQuery, type SearchResult, type SimpleFolderSearchParams, createSearchIndex, scanFiles, searchCandidates, simpleFolderSearch };

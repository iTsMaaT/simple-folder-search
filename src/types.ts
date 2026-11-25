import type { IFuseOptions } from "fuse.js";

/**
 * Custom file provider. When given, the folder is not scanned: the returned paths are used as-is
 * (they are not re-filtered by extension, so filter them yourself if needed).
 */
export type CacheCallback = (filePath: string, fileExtensions: string[], search?: SearchQuery) => Promise<string[]>;

/**
 * A search query:
 * - a string, matched against both the file name and its parent folder name
 * - a `[name, folder?]` tuple
 * - an object with `name` and/or `folder` (`artist` is accepted as an alias of `folder`)
 */
export type SearchQuery =
    | string
    | string[]
    | { name?: string; folder?: string; artist?: string };

/** A rule deciding whether a file or folder is skipped during the scan. */
export type IgnoreRule =
    | string
    | RegExp
    | ((filePath: string, isDirectory: boolean) => boolean);

/** Options controlling how the folder is scanned. */
export interface ScanOptions {
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
export interface MatcherOptions {
    /** Relative importance of the file name vs. the parent folder name. Default `{ name: 2, folder: 1 }`. */
    weights?: { name?: number; folder?: number };
    /** Match the query anywhere in the name instead of near its start. Default `true`. */
    ignoreLocation?: boolean;
    /** Raw Fuse.js options, merged over the defaults. */
    fuseOptions?: IFuseOptions<SearchCandidate>;
}

/** Options applied to a single search. */
export interface QueryOptions {
    /** Minimum similarity (0–1, higher = stricter) for a file to match. Default `0.6`. */
    minimumScore?: number;
    /** Maximum number of results. Default: no limit. */
    limit?: number;
    /** Return `{ path, score, name, folder }` objects instead of plain paths. Default `false`. */
    includeScores?: boolean;
}

export interface SearchOptions extends ScanOptions, MatcherOptions, QueryOptions {}

/** Object form of the {@link simpleFolderSearch} arguments. */
export interface SimpleFolderSearchParams extends SearchOptions {
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
export interface SearchCandidate {
    /** File name without extension. */
    name: string;
    /** Parent folder name. */
    folder?: string;
    /** @deprecated Alias of `folder`, kept for backward compatibility. */
    artist?: string;
    /** Full file path. */
    path: string;
}

export interface SearchResult {
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
export interface SearchIndex {
    /** Absolute path of the indexed folder. */
    readonly root: string;
    /** Indexed file paths, sorted. */
    readonly files: readonly string[];
    /** Number of indexed files. */
    readonly size: number;
    search(query: SearchQuery, options: QueryOptions & { includeScores: true }): SearchResult[];
    search(query: SearchQuery, options?: QueryOptions): string[];
    /** Re-scan the folder and rebuild the index. */
    refresh(): Promise<void>;
}

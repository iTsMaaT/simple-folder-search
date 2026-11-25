# Types

All types are exported from the package:

```ts
import type {
    SearchOptions, ScanOptions, MatcherOptions, QueryOptions,
    SearchQuery, SearchResult, SearchCandidate, SearchIndex,
    SimpleFolderSearchParams, CacheCallback, IgnoreRule,
} from "simple-folder-search";
```

## SearchQuery

```ts
type SearchQuery =
    | string                                              // matches the file name or the folder name
    | string[]                                            // [name, folder?]
    | { name?: string; folder?: string; artist?: string }; // `artist` is an alias of `folder`
```

An empty query (`""`, `[]`, `{}`) returns every file.

## SearchOptions

`SearchOptions` combines the three option groups below. See [Options](options.md) for details.

```ts
interface ScanOptions {
    batchSize?: number;
    parallelSearches?: number;
    maxDepth?: number;
    ignore?: IgnoreRule | IgnoreRule[];
    ignoreHidden?: boolean;
    followSymlinks?: boolean;
    signal?: AbortSignal;
    onError?: (error: unknown, filePath: string) => void;
}

interface MatcherOptions {
    weights?: { name?: number; folder?: number };
    ignoreLocation?: boolean;
    fuseOptions?: IFuseOptions<SearchCandidate>;
}

interface QueryOptions {
    minimumScore?: number;
    limit?: number;
    includeScores?: boolean;
}

interface SearchOptions extends ScanOptions, MatcherOptions, QueryOptions {}

type IgnoreRule = string | RegExp | ((filePath: string, isDirectory: boolean) => boolean);
```

## SimpleFolderSearchParams

The object form of the `simpleFolderSearch` arguments.

```ts
interface SimpleFolderSearchParams extends SearchOptions {
    path: string;
    extensions?: string[];
    query?: SearchQuery;
    cache?: CacheCallback;
}
```

## SearchResult

Returned when `includeScores: true` is set.

```ts
interface SearchResult {
    path: string;    // full file path
    score: number;   // similarity from 0 to 1, higher is better
    name: string;    // file name without extension
    folder?: string; // parent folder name
}
```

## SearchCandidate

What `searchCandidates` searches through.

```ts
interface SearchCandidate {
    name: string;
    folder?: string;
    /** @deprecated use `folder` */
    artist?: string;
    path: string;
}
```

## SearchIndex

Returned by `createSearchIndex`.

```ts
interface SearchIndex {
    readonly root: string;
    readonly files: readonly string[];
    readonly size: number;
    search(query: SearchQuery, options?: QueryOptions): string[]; // SearchResult[] with includeScores
    refresh(): Promise<void>;
}
```

## CacheCallback

A custom file provider. When it is given, the folder isn't scanned. Its result isn't filtered by extension again.

```ts
type CacheCallback = (filePath: string, fileExtensions: string[], search?: SearchQuery) => Promise<string[]>;
```

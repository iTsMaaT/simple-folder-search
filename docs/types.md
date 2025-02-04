# Types

This document describes the types used in the Simple Folder Search package.

## SearchOptions

```typescript
interface SearchOptions {
    minimumScore?: number;
    batchSize?: number;
    parallelSearches?: number;
}
```

## CacheCallback

A callback function type for custom caching logic.

```ts
type CacheCallback = (filePath: string, fileExtensions: string[], search?: string[] | string) => Promise<string[]>;
```

## SearchResult

```ts
interface SearchResult {
    filePath: string;
    score: number;
}
```

These types are used to define the options for the search and the structure of the search results.
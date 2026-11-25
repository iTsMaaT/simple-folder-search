import { promises as fsp } from "node:fs";
import path from "node:path";
import type { SearchOptions, SearchQuery } from "./types";

/** Resolves `filepath` against the cwd and checks that it is an existing directory. */
export async function resolveDirectory(filepath: string): Promise<string> {
    if (typeof filepath !== "string" || filepath === "") throw new Error("Filepath must be a non-empty string.");
    const absolutePath = path.resolve(process.cwd(), filepath);

    let isDirectory: boolean;
    try {
        isDirectory = (await fsp.stat(absolutePath)).isDirectory();
    } catch {
        throw new Error(`Filepath does not exist: ${absolutePath}`);
    }
    if (!isDirectory) throw new Error(`Filepath is not a directory: ${absolutePath}`);
    return absolutePath;
}

export function validateQuery(search: SearchQuery): void {
    if (search === undefined || search === null) return;
    if (typeof search === "string") return;
    if (Array.isArray(search)) {
        if (search.some(part => part !== undefined && part !== null && typeof part !== "string"))
            throw new Error("Search array must only contain strings.");
        return;
    }
    if (typeof search === "object") return;
    throw new Error("Search query must be a string, an array or an object.");
}

export function validateOptions(options: SearchOptions): void {
    if (typeof options !== "object" || options === null) throw new Error("Options must be an object.");
    const { minimumScore, batchSize, parallelSearches, limit, maxDepth, weights } = options;

    if (minimumScore !== undefined && (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 1))
        throw new Error("Minimum score must be a number between 0 and 1.");
    if (batchSize !== undefined && (!Number.isInteger(batchSize) || batchSize <= 0))
        throw new Error("Batch size must be a positive integer.");
    if (parallelSearches !== undefined && (!Number.isInteger(parallelSearches) || parallelSearches <= 0))
        throw new Error("Parallel searches must be a positive integer.");
    if (limit !== undefined && limit !== Infinity && (!Number.isInteger(limit) || limit <= 0))
        throw new Error("Limit must be a positive integer.");
    if (maxDepth !== undefined && maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 0))
        throw new Error("Max depth must be a non-negative integer.");
    if (weights !== undefined) {
        for (const weight of [weights.name, weights.folder]) {
            if (weight !== undefined && (!Number.isFinite(weight) || weight <= 0))
                throw new Error("Weights must be positive numbers.");
        }
    }
}

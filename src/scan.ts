import { promises as fsp, type Dirent } from "node:fs";
import path from "node:path";
import type { ScanOptions } from "./types";
import { createLimiter, throwIfAborted, yieldToEventLoop } from "./async-utils";
import { matchExtension, normalizeExtensions } from "./extensions";
import { compileIgnoreRules } from "./ignore";
import { resolveDirectory, validateOptions } from "./validation";

/**
 * Recursively list the files of a folder matching the given extensions.
 * Useful as a building block for a {@link CacheCallback}.
 *
 * @returns Absolute file paths, sorted.
 */
export async function scanFiles(
    filepath: string,
    fileExtensions: string[] = [],
    options: ScanOptions = {},
): Promise<string[]> {
    if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
    validateOptions(options);

    const {
        batchSize = 100,
        parallelSearches = 1,
        maxDepth = Infinity,
        ignoreHidden = false,
        followSymlinks = false,
        signal,
        onError,
    } = options;

    const root = await resolveDirectory(filepath);
    const extensions = normalizeExtensions(fileExtensions);
    const ignoreRules = compileIgnoreRules(options.ignore);
    const limit = createLimiter(parallelSearches);
    const visited = new Set<string>();
    const files: string[] = [];
    let processed = 0;

    const tick = async () => {
        if (++processed % batchSize === 0) await yieldToEventLoop();
        throwIfAborted(signal);
    };

    const isIgnored = (fullPath: string, name: string, isDirectory: boolean) => {
        if (ignoreHidden && name.startsWith(".")) return true;
        if (ignoreRules.length === 0) return false;
        const relative = path.relative(root, fullPath).split(path.sep).join("/");
        return ignoreRules.some(rule => rule(fullPath, name, relative, isDirectory));
    };

    const visit = async (dir: string, depth: number): Promise<void> => {
        throwIfAborted(signal);

        if (followSymlinks) {
            // Guard against symlink loops.
            const real = await fsp.realpath(dir).catch(() => dir);
            if (visited.has(real)) return;
            visited.add(real);
        }

        let entries: Dirent[];
        try {
            entries = await limit(() => fsp.readdir(dir, { withFileTypes: true }));
        } catch (error) {
            if (dir === root) throw error;
            onError?.(error, dir);
            return;
        }

        const subdirectories: string[] = [];
        for (const entry of entries) {
            await tick();
            const fullPath = path.join(dir, entry.name);

            let isDirectory = entry.isDirectory();
            let isFile = entry.isFile();
            if (entry.isSymbolicLink()) {
                try {
                    const stat = await fsp.stat(fullPath);
                    isDirectory = followSymlinks && stat.isDirectory();
                    isFile = stat.isFile();
                } catch (error) {
                    onError?.(error, fullPath); // broken link
                    continue;
                }
            }

            if (isDirectory) {
                if (depth < maxDepth && !isIgnored(fullPath, entry.name, true)) subdirectories.push(fullPath);
            } else if (isFile && matchExtension(entry.name, extensions) !== null && !isIgnored(fullPath, entry.name, false)) {
                files.push(fullPath);
            }
        }

        await Promise.all(subdirectories.map(sub => visit(sub, depth + 1)));
    };

    await visit(root, 0);
    // Concurrent reads finish in any order; sort for deterministic results.
    return files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

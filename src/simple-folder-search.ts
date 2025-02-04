import fs from "fs";
import path from "path";
import Fuse from "fuse.js";

type CacheCallback = (filePath: string, fileExtensions: string[], search?: string[] | string) => Promise<string[]>;

interface SearchOptions {
    minimumScore?: number;
    batchSize?: number;
    parallelSearches?: number;
}

/**
 * Perform a simple folder search based on file names and optionally artist names.
 * 
 * @param {string} filepath - The directory to search in.
 * @param {string[]} fileExtensions - An array of file extensions to filter by.
 * @param {string | string[]} search - The search query, either a string or an array of [name, artist].
 * @param {SearchOptions} [options] - Optional search options.
 * @param {CacheCallback} [cacheCallback] - Optional callback for custom caching logic.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths that match the search query.
 */
export async function simpleFolderSearch(
    filepath: string,
    fileExtensions: string[],
    search: string | string[],
    options: SearchOptions = {},
    cacheCallback?: CacheCallback,
): Promise<string[]> {
    const {
        minimumScore = 0.6,
        batchSize = 100,
        parallelSearches = 1,
    } = options;

    const absolutePath = path.resolve(process.cwd(), filepath);

    if (!fs.existsSync(absolutePath)) throw new Error("Filepath does not exist.");
    if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
    if (typeof search !== "string" && !Array.isArray(search)) throw new Error("Search query must be a string or an array.");
    if (typeof minimumScore !== "number") throw new Error("Minimum score must be a number.");
    if (minimumScore < 0 || minimumScore > 1) throw new Error("Minimum score must be between 0 and 1.");
    if (typeof batchSize !== "number" || batchSize <= 0) throw new Error("Batch size must be a positive number.");
    if (typeof parallelSearches !== "number" || parallelSearches <= 0) throw new Error("Parallel searches must be a positive number.");

    const filesForFuse: { name: string; artist?: string; path: string}[] = [];

    const processFiles = async (files: string[]) => {
        for (const file of files) {
            const fileData: { name: string; artist?: string; path: string} = {
                name: path.parse(file).name,
                artist: path.basename(path.dirname(file)),
                path: file,
            };

            filesForFuse.push(fileData);
        }
    };

    if (cacheCallback) {
        const cachedFiles = await cacheCallback(absolutePath, fileExtensions, search);
        await processFiles(cachedFiles);
    } else {
        function* collectFiles(dir: string): Generator<string[]> {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            let batch: string[] = [];
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    yield* collectFiles(fullPath);
                } else if (fileExtensions.length == 0 || fileExtensions.some(ext => entry.name.endsWith(ext))) {
                    batch.push(fullPath);
                    if (batch.length >= batchSize) {
                        yield batch;
                        batch = [];
                    }
                }
            }
            
            if (batch.length > 0) 
                yield batch;
        }

        for (const batch of collectFiles(absolutePath)) 
            await processFiles(batch);
        
    }

    // If search is empty, return all files with matching extensions
    if (!search || (Array.isArray(search) && search.length === 0)) 
        return filesForFuse.map(file => file.path);

    // Setup Fuse with options
    const fuseOptions = {
        includeScore: true,
        threshold: 1 - minimumScore, // Convert our score to Fuse threshold
        keys: ["name", "artist"],
    };

    const fuse = new Fuse(filesForFuse, fuseOptions);

    // Perform search and filter results
    const searchQueries = Array.isArray(search) ? [{ name: search[0], artist: search[1] }] : [search];
    const searchPromises = searchQueries.map(query => fuse.search(query));

    const results = await Promise.all(searchPromises);
    const flattenedResults = results.flat();

    return flattenedResults
        .filter(result => (result.score ? result.score <= (1 - minimumScore) : false))
        .map(result => result.item.path);
}
type CacheCallback = (filePath: string, fileExtensions: string[]) => Promise<string[]>;
/**
 * Perform a simple folder search based on file names and optionally artist names.
 *
 * @param {string} filepath - The directory to search in.
 * @param {string[]} fileExtensions - An array of file extensions to filter by.
 * @param {string | string[]} search - The search query, either a string or an array of [name, artist].
 * @param {number} [minimumScore=0.6] - The minimum score for a match to be considered valid.
 * @param {number} [batchSize=10] - The number of files to process in each batch.
 * @param {CacheCallback} [cacheCallback] - Optional callback for custom caching logic.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths that match the search query.
 */
declare function simpleFolderSearch(filepath: string, fileExtensions: string[], search: string | string[], minimumScore?: number, batchSize?: number, cacheCallback?: CacheCallback): Promise<string[]>;

export { simpleFolderSearch };

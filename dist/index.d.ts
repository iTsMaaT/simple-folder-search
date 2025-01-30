/**
 * Perform a simple folder search based on file names.
 *
 * @param {string} filepath - The directory to search in.
 * @param {string[]} fileExtensions - An array of file extensions to filter by.
 * @param {string} search - The search query.
 * @param {number} [minimumScore=0.6] - The minimum score for a match to be considered valid.
 * @returns {string[]} An array of file paths that match the search query.
 */
declare function simpleFolderSearch(filepath: string, fileExtensions: string[], search: string, minimumScore?: number): string[];

export { simpleFolderSearch };

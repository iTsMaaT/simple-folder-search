import fs from "fs";
import path from "path";
import Fuse from "fuse.js";

/**
 * Perform a simple folder search based on file names.
 * 
 * @param {string} filepath - The directory to search in.
 * @param {string[]} fileExtensions - An array of file extensions to filter by.
 * @param {string} search - The search query.
 * @param {number} [minimumScore=0.6] - The minimum score for a match to be considered valid.
 * @returns {string[]} An array of file paths that match the search query.
 */
export function simpleFolderSearch(filepath: string, fileExtensions: string[], search: string, minimumScore: number = 0.6): string[] {
    const absolutePath = path.resolve(process.cwd(), filepath);

    if (!fs.existsSync(absolutePath)) throw new Error("Filepath does not exist.");
    if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
    if (typeof search !== "string") throw new Error("Search query must be a string.");
    if (typeof minimumScore !== "number") throw new Error("Minimum score must be a number.");
    if (minimumScore < 0 || minimumScore > 1) throw new Error("Minimum score must be between 0 and 1.");

    /**
     * Recursively collects all files in a directory and its subdirectories.
     * 
     * @param {string} dir - The directory to collect files from.
     * @returns {string[]} An array of file paths.
     */
    const collectFiles = (dir: string): string[] => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        let files: string[] = [];
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) 
                files = files.concat(collectFiles(fullPath));
            else if (fileExtensions.some(ext => entry.name.endsWith(ext))) 
                files.push(fullPath);
            
        }
        return files;
    };

    const allFiles = collectFiles(absolutePath);

    // If search is empty, return all files with matching extensions
    if (!search.trim()) 
        return allFiles;
    

    // Setup Fuse with options
    const fuseOptions = {
        includeScore: true,
        threshold: 1 - minimumScore, // Convert our score to Fuse threshold
        keys: ["name"],
    };

    const filesForFuse = allFiles.map(file => ({
        name: path.parse(file).name,
        path: file,
    }));

    const fuse = new Fuse(filesForFuse, fuseOptions);
    
    // Perform search and filter results
    const results = fuse.search(search);
    return results
        .filter(result => (result.score ? result.score <= (1 - minimumScore) : false))
        .map(result => result.item.path);
}
// src/simple-folder-search.ts
import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
function simpleFolderSearch(filepath, fileExtensions, search, minimumScore = 0.6) {
  const absolutePath = path.resolve(process.cwd(), filepath);
  if (!fs.existsSync(absolutePath)) throw new Error("Filepath does not exist.");
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  if (typeof search !== "string") throw new Error("Search query must be a string.");
  if (typeof minimumScore !== "number") throw new Error("Minimum score must be a number.");
  if (minimumScore < 0 || minimumScore > 1) throw new Error("Minimum score must be between 0 and 1.");
  const collectFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory())
        files = files.concat(collectFiles(fullPath));
      else if (fileExtensions.some((ext) => entry.name.endsWith(ext)))
        files.push(fullPath);
    }
    return files;
  };
  const allFiles = collectFiles(absolutePath);
  if (!search.trim())
    return allFiles;
  const fuseOptions = {
    includeScore: true,
    threshold: 1 - minimumScore,
    // Convert our score to Fuse threshold
    keys: ["name"]
  };
  const filesForFuse = allFiles.map((file) => ({
    name: path.parse(file).name,
    path: file
  }));
  const fuse = new Fuse(filesForFuse, fuseOptions);
  const results = fuse.search(search);
  return results.filter((result) => result.score ? result.score <= 1 - minimumScore : false).map((result) => result.item.path);
}
export {
  simpleFolderSearch
};

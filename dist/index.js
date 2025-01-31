// src/simple-folder-search.ts
import fs from "fs";
import path from "path";
import Fuse from "fuse.js";
async function simpleFolderSearch(filepath, fileExtensions, search, minimumScore = 0.6, batchSize = 100, cacheCallback) {
  const absolutePath = path.resolve(process.cwd(), filepath);
  if (!fs.existsSync(absolutePath)) throw new Error("Filepath does not exist.");
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  if (typeof search !== "string" && !Array.isArray(search)) throw new Error("Search query must be a string or an array.");
  if (typeof minimumScore !== "number") throw new Error("Minimum score must be a number.");
  if (minimumScore < 0 || minimumScore > 1) throw new Error("Minimum score must be between 0 and 1.");
  if (typeof batchSize !== "number" || batchSize <= 0) throw new Error("Batch size must be a positive number.");
  let filesForFuse = [];
  if (cacheCallback) {
    const cachedFiles = await cacheCallback(absolutePath, fileExtensions);
    filesForFuse = cachedFiles.map((file) => ({
      name: path.parse(file).name,
      artist: path.basename(path.dirname(file)),
      path: file
    }));
  } else {
    function* collectFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      let batch = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          yield* collectFiles(fullPath);
        } else if (fileExtensions.length == 0 || fileExtensions.some((ext) => entry.name.endsWith(ext))) {
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
    for (const batch of collectFiles(absolutePath)) {
      for (const file of batch) {
        filesForFuse.push({
          name: path.parse(file).name,
          artist: path.basename(path.dirname(file)),
          path: file
        });
      }
    }
  }
  if (!search || Array.isArray(search) && search.length === 0)
    return filesForFuse.map((file) => file.path);
  const fuseOptions = {
    includeScore: true,
    threshold: 1 - minimumScore,
    // Convert our score to Fuse threshold
    keys: ["name", "artist"]
  };
  const fuse = new Fuse(filesForFuse, fuseOptions);
  const results = Array.isArray(search) ? fuse.search({ name: search[0], artist: search[1] }) : fuse.search(search);
  return results.filter((result) => result.score ? result.score <= 1 - minimumScore : false).map((result) => result.item.path);
}
export {
  simpleFolderSearch
};

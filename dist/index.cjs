"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  simpleFolderSearch: () => simpleFolderSearch
});
module.exports = __toCommonJS(index_exports);

// src/simple-folder-search.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_fuse = __toESM(require("fuse.js"), 1);
async function simpleFolderSearch(filepath, fileExtensions, search, minimumScore = 0.6, batchSize = 100, cacheCallback) {
  const absolutePath = import_path.default.resolve(process.cwd(), filepath);
  if (!import_fs.default.existsSync(absolutePath)) throw new Error("Filepath does not exist.");
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  if (typeof search !== "string" && !Array.isArray(search)) throw new Error("Search query must be a string or an array.");
  if (typeof minimumScore !== "number") throw new Error("Minimum score must be a number.");
  if (minimumScore < 0 || minimumScore > 1) throw new Error("Minimum score must be between 0 and 1.");
  if (typeof batchSize !== "number" || batchSize <= 0) throw new Error("Batch size must be a positive number.");
  let filesForFuse = [];
  if (cacheCallback) {
    const cachedFiles = await cacheCallback(absolutePath, fileExtensions);
    filesForFuse = cachedFiles.map((file) => ({
      name: import_path.default.parse(file).name,
      artist: import_path.default.basename(import_path.default.dirname(file)),
      path: file
    }));
  } else {
    function* collectFiles(dir) {
      const entries = import_fs.default.readdirSync(dir, { withFileTypes: true });
      let batch = [];
      for (const entry of entries) {
        const fullPath = import_path.default.join(dir, entry.name);
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
          name: import_path.default.parse(file).name,
          artist: import_path.default.basename(import_path.default.dirname(file)),
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
  const fuse = new import_fuse.default(filesForFuse, fuseOptions);
  const results = Array.isArray(search) ? fuse.search({ name: search[0], artist: search[1] }) : fuse.search(search);
  return results.filter((result) => result.score ? result.score <= 1 - minimumScore : false).map((result) => result.item.path);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  simpleFolderSearch
});

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
  createSearchIndex: () => createSearchIndex,
  scanFiles: () => scanFiles,
  searchCandidates: () => searchCandidates,
  simpleFolderSearch: () => simpleFolderSearch
});
module.exports = __toCommonJS(index_exports);

// src/async-utils.ts
function createLimiter(max) {
  let active = 0;
  const waiting = [];
  return async (fn) => {
    if (active >= max) await new Promise((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await fn();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason ?? new Error("The operation was aborted.");
}
function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

// src/candidates.ts
var import_node_path = __toESM(require("path"), 1);

// src/extensions.ts
function normalizeExtensions(extensions) {
  return extensions.filter((ext) => typeof ext === "string" && ext.trim() !== "").map((ext) => {
    const lower = ext.trim().toLowerCase();
    return lower.startsWith(".") ? lower : `.${lower}`;
  });
}
function matchExtension(fileName, extensions) {
  if (extensions.length === 0) return "";
  const lower = fileName.toLowerCase();
  let best = null;
  for (const ext of extensions) {
    if (lower.endsWith(ext) && lower.length > ext.length && (best === null || ext.length > best.length))
      best = ext;
  }
  return best;
}

// src/candidates.ts
async function toCandidates(files, extensions, options) {
  const { batchSize = 100, signal } = options;
  const candidates = [];
  for (let i = 0; i < files.length; i++) {
    if (i > 0 && i % batchSize === 0) {
      await yieldToEventLoop();
      throwIfAborted(signal);
    }
    const file = files[i];
    const base = import_node_path.default.basename(file);
    const ext = matchExtension(base, extensions);
    const folder = import_node_path.default.basename(import_node_path.default.dirname(file));
    candidates.push({
      name: ext ? base.slice(0, base.length - ext.length) : import_node_path.default.parse(file).name,
      folder,
      artist: folder,
      path: file
    });
  }
  return candidates;
}

// src/matcher.ts
var import_fuse = __toESM(require("fuse.js"), 1);
var DEFAULT_MINIMUM_SCORE = 0.6;
function createMatcher(candidates, options) {
  const { weights = {}, ignoreLocation = true, fuseOptions = {} } = options;
  const nameWeight = weights.name ?? 2;
  const folderWeight = weights.folder ?? 1;
  const keys = fuseOptions.keys ?? [
    { name: "name", weight: nameWeight },
    { name: "folder", weight: folderWeight }
  ];
  const index = import_fuse.default.createIndex(keys, candidates, fuseOptions.getFn ? { getFn: fuseOptions.getFn } : void 0);
  const fuseFor = (minimumScore) => new import_fuse.default(candidates, {
    includeScore: true,
    ignoreLocation,
    threshold: 1 - minimumScore,
    ...fuseOptions,
    keys
  }, index);
  return {
    candidates,
    search(search, queryOptions) {
      const { minimumScore = DEFAULT_MINIMUM_SCORE, limit = Infinity, includeScores = false } = queryOptions;
      const query = parseQuery(search);
      const maxFuseScore = 1 - minimumScore;
      let results;
      if (query === null) {
        results = candidates.slice(0, limit).map((c) => toResult(c, 0));
      } else if (typeof query === "string" || query.name === void 0 || query.folder === void 0) {
        const expression = typeof query === "string" ? query : query.name !== void 0 ? { name: query.name } : { folder: query.folder };
        const found = Number.isFinite(limit) ? fuseFor(minimumScore).search(expression, { limit }) : fuseFor(minimumScore).search(expression);
        results = found.filter((r) => (r.score ?? 0) <= maxFuseScore).map((r) => toResult(r.item, r.score ?? 0));
      } else {
        const fuse = fuseFor(minimumScore);
        const folderScores = /* @__PURE__ */ new Map();
        for (const r of fuse.search({ folder: query.folder })) folderScores.set(r.refIndex, r.score ?? 0);
        const combined = [];
        for (const r of fuse.search({ name: query.name })) {
          const folderScore = folderScores.get(r.refIndex);
          if (folderScore === void 0) continue;
          const score = (nameWeight * (r.score ?? 0) + folderWeight * folderScore) / (nameWeight + folderWeight);
          if (score <= maxFuseScore) combined.push({ item: r.item, refIndex: r.refIndex, score });
        }
        combined.sort((a, b) => a.score - b.score || a.refIndex - b.refIndex);
        results = combined.map((r) => toResult(r.item, r.score));
      }
      results = results.slice(0, limit);
      return includeScores ? results : results.map((r) => r.path);
    }
  };
}
function toResult(candidate, fuseScore) {
  return {
    path: candidate.path,
    score: Math.round((1 - fuseScore) * 1e6) / 1e6,
    name: candidate.name,
    folder: candidate.folder
  };
}
function parseQuery(search) {
  let name;
  let folder;
  if (typeof search === "string") return search.trim() === "" ? null : search;
  if (Array.isArray(search)) {
    [name, folder] = search;
  } else {
    name = search.name;
    folder = search.folder ?? search.artist;
  }
  name = name?.trim() ? name : void 0;
  folder = folder?.trim() ? folder : void 0;
  if (name === void 0 && folder === void 0) return null;
  return { name, folder };
}

// src/scan.ts
var import_node_fs2 = require("fs");
var import_node_path3 = __toESM(require("path"), 1);

// src/ignore.ts
function compileIgnoreRules(ignore) {
  if (ignore === void 0) return [];
  const rules = Array.isArray(ignore) ? ignore : [ignore];
  return rules.map((rule) => {
    if (typeof rule === "function") return (fullPath, _name, _relative, isDirectory) => rule(fullPath, isDirectory);
    if (rule instanceof RegExp) return (_fullPath, name, relative) => testRegExp(rule, name) || testRegExp(rule, relative);
    if (typeof rule === "string") {
      const regex = globToRegExp(rule.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/$/, ""));
      return rule.includes("/") ? (_fullPath, _name, relative) => regex.test(relative) : (_fullPath, name) => regex.test(name);
    }
    throw new Error("Ignore rules must be strings, regular expressions or functions.");
  });
}
function testRegExp(regex, value) {
  regex.lastIndex = 0;
  return regex.test(value);
}
function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        source += ".*";
        i++;
        if (glob[i + 1] === "/") i++;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`, process.platform === "win32" ? "i" : "");
}

// src/validation.ts
var import_node_fs = require("fs");
var import_node_path2 = __toESM(require("path"), 1);
async function resolveDirectory(filepath) {
  if (typeof filepath !== "string" || filepath === "") throw new Error("Filepath must be a non-empty string.");
  const absolutePath = import_node_path2.default.resolve(process.cwd(), filepath);
  let isDirectory;
  try {
    isDirectory = (await import_node_fs.promises.stat(absolutePath)).isDirectory();
  } catch {
    throw new Error(`Filepath does not exist: ${absolutePath}`);
  }
  if (!isDirectory) throw new Error(`Filepath is not a directory: ${absolutePath}`);
  return absolutePath;
}
function validateQuery(search) {
  if (search === void 0 || search === null) return;
  if (typeof search === "string") return;
  if (Array.isArray(search)) {
    if (search.some((part) => part !== void 0 && part !== null && typeof part !== "string"))
      throw new Error("Search array must only contain strings.");
    return;
  }
  if (typeof search === "object") return;
  throw new Error("Search query must be a string, an array or an object.");
}
function validateOptions(options) {
  if (typeof options !== "object" || options === null) throw new Error("Options must be an object.");
  const { minimumScore, batchSize, parallelSearches, limit, maxDepth, weights } = options;
  if (minimumScore !== void 0 && (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 1))
    throw new Error("Minimum score must be a number between 0 and 1.");
  if (batchSize !== void 0 && (!Number.isInteger(batchSize) || batchSize <= 0))
    throw new Error("Batch size must be a positive integer.");
  if (parallelSearches !== void 0 && (!Number.isInteger(parallelSearches) || parallelSearches <= 0))
    throw new Error("Parallel searches must be a positive integer.");
  if (limit !== void 0 && limit !== Infinity && (!Number.isInteger(limit) || limit <= 0))
    throw new Error("Limit must be a positive integer.");
  if (maxDepth !== void 0 && maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 0))
    throw new Error("Max depth must be a non-negative integer.");
  if (weights !== void 0) {
    for (const weight of [weights.name, weights.folder]) {
      if (weight !== void 0 && (!Number.isFinite(weight) || weight <= 0))
        throw new Error("Weights must be positive numbers.");
    }
  }
}

// src/scan.ts
async function scanFiles(filepath, fileExtensions = [], options = {}) {
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  validateOptions(options);
  const {
    batchSize = 100,
    parallelSearches = 1,
    maxDepth = Infinity,
    ignoreHidden = false,
    followSymlinks = false,
    signal,
    onError
  } = options;
  const root = await resolveDirectory(filepath);
  const extensions = normalizeExtensions(fileExtensions);
  const ignoreRules = compileIgnoreRules(options.ignore);
  const limit = createLimiter(parallelSearches);
  const visited = /* @__PURE__ */ new Set();
  const files = [];
  let processed = 0;
  const tick = async () => {
    if (++processed % batchSize === 0) await yieldToEventLoop();
    throwIfAborted(signal);
  };
  const isIgnored = (fullPath, name, isDirectory) => {
    if (ignoreHidden && name.startsWith(".")) return true;
    if (ignoreRules.length === 0) return false;
    const relative = import_node_path3.default.relative(root, fullPath).split(import_node_path3.default.sep).join("/");
    return ignoreRules.some((rule) => rule(fullPath, name, relative, isDirectory));
  };
  const visit = async (dir, depth) => {
    throwIfAborted(signal);
    if (followSymlinks) {
      const real = await import_node_fs2.promises.realpath(dir).catch(() => dir);
      if (visited.has(real)) return;
      visited.add(real);
    }
    let entries;
    try {
      entries = await limit(() => import_node_fs2.promises.readdir(dir, { withFileTypes: true }));
    } catch (error) {
      if (dir === root) throw error;
      onError?.(error, dir);
      return;
    }
    const subdirectories = [];
    for (const entry of entries) {
      await tick();
      const fullPath = import_node_path3.default.join(dir, entry.name);
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stat = await import_node_fs2.promises.stat(fullPath);
          isDirectory = followSymlinks && stat.isDirectory();
          isFile = stat.isFile();
        } catch (error) {
          onError?.(error, fullPath);
          continue;
        }
      }
      if (isDirectory) {
        if (depth < maxDepth && !isIgnored(fullPath, entry.name, true)) subdirectories.push(fullPath);
      } else if (isFile && matchExtension(entry.name, extensions) !== null && !isIgnored(fullPath, entry.name, false)) {
        files.push(fullPath);
      }
    }
    await Promise.all(subdirectories.map((sub) => visit(sub, depth + 1)));
  };
  await visit(root, 0);
  return files.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

// src/search.ts
async function simpleFolderSearch(filepathOrParams, fileExtensions = [], search = "", options = {}, cacheCallback) {
  let filepath;
  if (typeof filepathOrParams === "object" && filepathOrParams !== null) {
    const { path: dir, extensions: extensions2 = [], query = "", cache, ...rest } = filepathOrParams;
    filepath = dir;
    fileExtensions = extensions2;
    search = query;
    options = rest;
    cacheCallback = cache;
  } else {
    filepath = filepathOrParams;
  }
  if (typeof filepath !== "string") throw new Error("Filepath must be a string.");
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  validateQuery(search);
  validateOptions(options);
  const absolutePath = await resolveDirectory(filepath);
  const extensions = normalizeExtensions(fileExtensions);
  const files = cacheCallback ? await cacheCallback(absolutePath, fileExtensions, search) : await scanFiles(absolutePath, fileExtensions, options);
  throwIfAborted(options.signal);
  const candidates = await toCandidates(files, extensions, options);
  return createMatcher(candidates, options).search(search, options);
}
async function searchCandidates(candidates, search, minimumScore, options = {}) {
  if (!Array.isArray(candidates)) throw new Error("Candidates must be an array.");
  const merged = { ...options, minimumScore: minimumScore ?? options.minimumScore };
  validateQuery(search);
  validateOptions(merged);
  const normalized = candidates.map((c) => ({ ...c, folder: c.folder ?? c.artist }));
  return createMatcher(normalized, merged).search(search, merged);
}

// src/search-index.ts
async function createSearchIndex(filepath, fileExtensions = [], options = {}) {
  if (!Array.isArray(fileExtensions)) throw new Error("fileExtensions must be an array.");
  validateOptions(options);
  const root = await resolveDirectory(filepath);
  const extensions = normalizeExtensions(fileExtensions);
  let files = [];
  let matcher = createMatcher([], options);
  const refresh = async () => {
    const scanned = await scanFiles(root, fileExtensions, options);
    const candidates = await toCandidates(scanned, extensions, options);
    files = scanned;
    matcher = createMatcher(candidates, options);
  };
  await refresh();
  function searchIndex(query, queryOptions = {}) {
    const merged = { ...options, ...queryOptions };
    validateQuery(query);
    validateOptions(merged);
    return matcher.search(query, merged);
  }
  return {
    root,
    get files() {
      return files;
    },
    get size() {
      return files.length;
    },
    search: searchIndex,
    refresh
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createSearchIndex,
  scanFiles,
  searchCandidates,
  simpleFolderSearch
});

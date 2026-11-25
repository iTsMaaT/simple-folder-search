# Options

Every option is optional. They can be passed as the 4th argument of `simpleFolderSearch`, inside the object form (`simpleFolderSearch({ path, ...options })`), to `createSearchIndex`, or (scan options only) to `scanFiles`.

## Matching

### minimumScore

- **Type:** `number` (0–1)
- **Default:** `0.6`
- **Description:** The minimum similarity for a file to be considered a match. `1` only accepts exact matches, `0` accepts anything. It is the same scale as the `score` returned with `includeScores`.

### limit

- **Type:** `number`
- **Default:** no limit
- **Description:** The maximum number of results to return (best matches first).

### includeScores

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Return [`SearchResult`](types.md#searchresult) objects (`{ path, score, name, folder }`) instead of plain file paths.

### weights

- **Type:** `{ name?: number; folder?: number }`
- **Default:** `{ name: 2, folder: 1 }`
- **Description:** How much the file name counts compared to the parent folder name.

### ignoreLocation

- **Type:** `boolean`
- **Default:** `true`
- **Description:** When `true`, the query can match anywhere in a file name (`"my song"` finds `01 - Artist - My Song (Remastered).mp3`). Set it to `false` to prefer matches near the start of the name, which was the behavior before 2.4.0.

### fuseOptions

- **Type:** [`IFuseOptions`](https://www.fusejs.io/api/options.html)
- **Default:** `{}`
- **Description:** Raw [Fuse.js](https://www.fusejs.io/) options, merged over the defaults. Use this for anything not covered above (for example `isCaseSensitive` or custom `keys`).

## Scanning

### maxDepth

- **Type:** `number`
- **Default:** `Infinity`
- **Description:** How many folder levels below the root to search. `0` only searches the root folder itself.

### ignore

- **Type:** `string | RegExp | ((filePath: string, isDirectory: boolean) => boolean)`, or an array of these
- **Default:** none
- **Description:** Files and folders to skip. Ignored folders are not entered at all.
  - **string**: a glob (`*`, `**`, `?`). Without a `/` it matches the file or folder name (`"node_modules"`, `"*.tmp"`). With a `/` it matches the path relative to the searched folder (`"Artist B/**"`).
  - **RegExp**: tested against the name and the relative path (using `/` separators).
  - **function**: receives the absolute path and whether it is a folder; return `true` to skip it.

```js
await simpleFolderSearch("./music", [".mp3"], "my song", {
    ignore: ["node_modules", "*.part", /backup/i, (filePath, isDir) => isDir && filePath.endsWith("old")],
});
```

### ignoreHidden

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Skip files and folders whose name starts with a dot.

### followSymlinks

- **Type:** `boolean`
- **Default:** `false`
- **Description:** Enter symlinked folders. Symlinked files are always included. Symlink loops are detected and skipped.

### parallelSearches

- **Type:** `number`
- **Default:** `1`
- **Description:** The maximum number of folders read at the same time. Higher values can speed up scanning on SSDs and network drives. Results are always returned in the same order, whatever the value.

### batchSize

- **Type:** `number`
- **Default:** `100`
- **Description:** The number of files processed before yielding back to the event loop. Lower values keep your app responsive while scanning very large folders; higher values scan slightly faster.

### signal

- **Type:** `AbortSignal`
- **Default:** none
- **Description:** Cancels the search. The promise rejects with `signal.reason`.

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
await simpleFolderSearch("./music", [".mp3"], "my song", { signal: controller.signal });
```

### onError

- **Type:** `(error: unknown, filePath: string) => void`
- **Default:** none
- **Description:** Called when a sub-folder can't be read (for example because of permissions) or a symlink is broken. Those entries are skipped either way. An unreadable root folder still rejects the promise.

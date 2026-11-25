# Custom Caching

Scanning a large folder on every search is slow. There are two ways to avoid it.

## Built-in: `createSearchIndex` (recommended)

For most cases you don't need a custom cache. `createSearchIndex` scans the folder once, keeps the fuzzy index in memory, and lets you re-scan when you want:

```js
import { createSearchIndex } from "simple-folder-search";

const index = await createSearchIndex("./music", [".mp3", ".wav"]);

index.search("my song");
await index.refresh(); // for example from a file watcher or a timer
```

## Custom file provider (`cacheCallback`)

To get the file list from somewhere else (a database, a remote index…), pass a callback as the 5th argument of `simpleFolderSearch` (or as `cache` in the object form). When it is given, the folder isn't scanned: the callback's paths are fuzzy-searched as-is.

```ts
type CacheCallback = (filePath: string, fileExtensions: string[], search?: SearchQuery) => Promise<string[]>;
```

The callback's result is **not** filtered by extension again, so return only the files you want searched.

### In-memory cache example

`scanFiles` does the folder walk for you:

```js
import { simpleFolderSearch, scanFiles } from "simple-folder-search";

const cache = new Map();

async function inMemoryCacheCallback(filePath, fileExtensions) {
    const key = `${filePath}|${fileExtensions.join(",")}`;
    if (!cache.has(key)) cache.set(key, await scanFiles(filePath, fileExtensions));
    return cache.get(key);
}

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { minimumScore: 0.6 }, inMemoryCacheCallback);
```

### Database cache example

You can use a lightweight database such as SQLite.

1. Install SQLite:

```bash
npm install sqlite3
```

2. Index the files and store them in the database:

```js
import sqlite3 from "sqlite3";
import path from "node:path";
import { scanFiles } from "simple-folder-search";

const db = new sqlite3.Database("files.db");
const files = await scanFiles("./music");

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS files (name TEXT, path TEXT UNIQUE, extension TEXT)");
    const insert = db.prepare("INSERT OR IGNORE INTO files (name, path, extension) VALUES (?, ?, ?)");
    for (const file of files)
        insert.run(path.basename(file), file, path.extname(file).toLowerCase());
    insert.finalize();
});

db.close();
```

3. Read the files from the database in the cache callback.

This callback also pre-filters rows on the words of the query, since the database narrows results much faster than fuzzy matching does. All values are passed as `?` parameters: never concatenate user input into SQL.

```js
import sqlite3 from "sqlite3";
import { simpleFolderSearch } from "simple-folder-search";

const db = new sqlite3.Database("files.db");

function dbCacheCallback(filePath, fileExtensions, search) {
    const text = !search ? "" : typeof search === "string" ? search : Object.values(search).join(" ");
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);

    const where = [];
    const params = [];
    if (fileExtensions.length > 0) {
        where.push(`extension IN (${fileExtensions.map(() => "?").join(",")})`);
        params.push(...fileExtensions.map(ext => ext.toLowerCase()));
    }
    if (words.length > 0) {
        where.push(`(${words.map(() => "LOWER(path) LIKE ? ESCAPE '\\'").join(" OR ")})`);
        params.push(...words.map(word => `%${word.replace(/[\\%_]/g, "\\$&")}%`));
    }

    const sql = `SELECT path FROM files${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows.map(row => row.path))));
    });
}

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { minimumScore: 0.6 }, dbCacheCallback);
```

This lets you plug in whatever storage you need: an in-memory cache, a database, or anything else.

# Custom Caching

The Simple Folder Search package supports custom caching to improve search performance. You can provide a custom caching method to the `simpleFolderSearch` function using a callback. This allows you to use different caching mechanisms, such as an in-memory cache or a database.

## In-Memory Cache Example

```javascript
const cache = {};

async function inMemoryCacheCallback(filePath, fileExtensions) {
    if (cache[filePath]) {
        return cache[filePath];
    }

    // Default file collection logic
    const files = [];
    function collectFiles(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collectFiles(fullPath);
            } else if (fileExtensions.length === 0 || fileExtensions.some(ext => entry.name.endsWith(ext))) {
                files.push(fullPath);
            }
        }
    }

    collectFiles(filePath);
    cache[filePath] = files;
    return files;
}

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { minimumScore: 0.6, batchSize: 100 }, inMemoryCacheCallback);
console.log(results);
```

## Database Cache Example

You can use a lightweight database like SQLite for caching.

1. Install SQLite:

```bash
npm install sqlite3
```

2. Indexing Files: Create a script to index files and store them in the database.

```js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('files.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS files (name TEXT, path TEXT, extension TEXT)");

    const indexFiles = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                indexFiles(fullPath);
            } else {
                const ext = path.extname(entry.name);
                db.run("INSERT INTO files (name, path, extension) VALUES (?, ?, ?)", [entry.name, fullPath, ext]);
            }
        }
    };

    indexFiles("./your-directory");
});

db.close();
```

3. Database Cache Callback: Implement the cache callback to fetch files from the database.

This method also pre-checks the search to filter words out of the database results, as the database searches much faster than fuzzy-matching

```js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('files.db');

async function dbCacheCallback(filePath, fileExtensions) {
    return new Promise((resolve, reject) => {
        const exts = fileExtensions.map(() => '?').join(',');
        const tokens = (!search ? '1=1' : Array.isArray(search) ? search.join(' '): search).toLowerCase().split(' ').map(x => 'path LIKE "%'+x+'%"').join(' OR ');
        db.all("SELECT path FROM files WHERE extension IN (" + exts + ") AND (" + tokens + ")", fileExtensions, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.path));
            }
        });
    });
}

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { minimumScore: 0.6, batchSize: 100 }, dbCacheCallback);
console.log(results);
```

This approach allows you to customize the caching mechanism according to your needs, whether it's an in-memory cache, a database, or any other storage solution.
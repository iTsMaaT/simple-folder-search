# Simple Folder Search

This package provides a simple way to search for files within a folder. It is designed to be easy to use and integrate into your projects.

This was mostly made for use with the `discord-player` package, but it can still be used almost everywhere.

## Features

- Search for files by name
- Filter files by extension
- Recursive search through subdirectories

## Installation

To install the package, use the following command:

```bash
npm install simple-folder-search
```

## Usage

Here is an example of how to use the package to search for files and play a file using `discord-player`'s search method:

```javascript
const { simpleFolderSearch } = require('simple-folder-search');
const { Player, QueryType } = require('discord-player');

// Initialize the player
const player = new Player(client);

// Search for music files in your music folder
const musicFiles = simpleFolderSearch('./music', ['.mp3', '.wav'], 'my song', 0.6);

if (musicFiles.length > 0) {
    // Get the first matching file
    const firstMatch = musicFiles[0];
    
    // Search the track using the proper engine
    const research = player.search(firstMatch, {
        searchEngine: QueryType.FILE,
    });

    // Play the file using discord-player
    await player.play(voiceChannel, research);
} else {
    console.log('No matching files found');
}
```

### Searching by Name and Artist

You can also search for files using both the file name and the artist (folder name) by providing the search query as an array. The first element of the array should be the file name, and the second element should be the artist (folder name).

```javascript
const results = await simpleFolderSearch("./music", [".mp3", ".wav"], ["my song", "artist name"], 0.6, 100);
console.log(results);
```

In this example, the search will look for files named "my song" within folders named "artist name".

### Normal behaviour

Normally, simple-folder-search will go through files loading one batch at a time, which you can configure. A batch of 10, for example, consists of 10 fully loaded files, it will then push the file names to an array and then reset the batch and start again. This ensures that not all files are loaded at once, which could take a lot of memory.

The issue with that is that files will always be loaded again each time the function is called.

### Custom caching method

You can provide a custom caching method to the `simpleFolderSearch` function using a callback. This allows you to use different caching mechanisms, such as an in-memory cache or a database.

#### In-Memory Cache Example

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

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", 0.6, 100, inMemoryCacheCallback);
console.log(results);
```

#### Database Cache Example

You can use a lightweight database like SQLite for caching.

1. **Install SQLite**:
   ```bash
   npm install sqlite3
   ```

2. **Indexing Files**:
   Create a script to index files and store them in the database.

   ```javascript
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

3. **Database Cache Callback**:
   Implement the cache callback to fetch files from the database.

   ```javascript
   const sqlite3 = require('sqlite3').verbose();
   const db = new sqlite3.Database('files.db');

   async function dbCacheCallback(filePath, fileExtensions) {
       return new Promise((resolve, reject) => {
           db.all("SELECT path FROM files WHERE extension IN (" + fileExtensions.map(() => '?').join(',') + ")", fileExtensions, (err, rows) => {
               if (err) {
                   reject(err);
               } else {
                   resolve(rows.map(row => row.path));
               }
           });
       });
   }

   const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", 0.6, 100, dbCacheCallback);
   console.log(results);
   ```

This approach allows you to customize the caching mechanism according to your needs, whether it's an in-memory cache, a database, or any other storage solution.

## Types

The `simpleFolderSearch` function uses the following types:

### `CacheCallback`

A callback function type for custom caching logic.

```typescript
type CacheCallback = (filePath: string, fileExtensions: string[]) => Promise<string[]>;
```

### `simpleFolderSearch`

The main function to perform a simple folder search.

```typescript
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
export async function simpleFolderSearch(
    filepath: string,
    fileExtensions: string[],
    search: string | string[],
    minimumScore: number = 0.6,
    batchSize: number = 100,
    cacheCallback?: CacheCallback
): Promise<string[]>;
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.
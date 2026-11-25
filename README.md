# Simple Folder Search

Fuzzy-search the files in a folder by file name and parent folder name, powered by [Fuse.js](https://www.fusejs.io/). Works with ESM and CommonJS and ships TypeScript types.

## Installation

```bash
npm install simple-folder-search
```

Requires Node.js 18 or later.

## Usage

```js
import { simpleFolderSearch } from "simple-folder-search";
// or: const { simpleFolderSearch } = require("simple-folder-search");

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { minimumScore: 0.6 });
console.log(results); // best match first
```

Search by file name and folder, get scores, limit results:

```js
await simpleFolderSearch("./music", [".mp3"], ["my song", "artist name"], { includeScores: true, limit: 5 });
// [{ path, score, name, folder }, ...]
```

Scan once and search many times:

```js
import { createSearchIndex } from "simple-folder-search";

const index = await createSearchIndex("./music", [".mp3"]);
index.search("my song");
await index.refresh();
```

For more examples, see the [Usage documentation](docs/usage.md).

## Features

- Recursive, async folder scan with optional parallel reads
- Case-insensitive extension filter, including multi-part extensions (`.tar.gz`)
- Query by file name, folder name, or both
- Scores, result limit, `maxDepth`, ignore patterns, hidden-file and symlink handling
- `AbortSignal` support
- A reusable in-memory index, and pluggable custom caching

## Documentation

- [Installation](docs/installation.md)
- [Usage](docs/usage.md)
- [Options](docs/options.md)
- [Custom Caching](docs/caching.md)
- [Types](docs/types.md)

## Development

```bash
npm install
npm test          # node:test via tsx
npm run lint
npm run typecheck
npm run build
```

## License

This project is licensed under the MIT License.

# Usage

## Basic search

```js
import { simpleFolderSearch } from "simple-folder-search";
// or: const { simpleFolderSearch } = require("simple-folder-search");

const results = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song");
// ["/abs/path/music/Artist/my song.mp3", ...] best match first
```

- The folder is searched recursively.
- Extensions are case-insensitive and the leading dot is optional (`"mp3"`, `".MP3"`). Multi-part extensions like `".tar.gz"` work. An empty array means all files.
- A string query is matched against both the file name (without extension) and the name of the folder containing it.
- An empty query returns every matching file.

## Searching by name and folder

Pass `[name, folder]` (or `{ name, folder }`) to match the file name and its parent folder separately. This is handy for `Artist/Song.mp3` libraries:

```js
await simpleFolderSearch("./music", [".mp3"], ["my song", "artist name"]);
await simpleFolderSearch("./music", [".mp3"], { name: "my song", folder: "artist name" });
await simpleFolderSearch("./music", [".mp3"], { folder: "artist name" }); // everything by one artist
```

`["my song"]` on its own searches by file name only. `artist` is still accepted as an alias of `folder`.

## Object form

All arguments can be passed as one object:

```js
await simpleFolderSearch({
    path: "./music",
    extensions: [".mp3"],
    query: "my song",
    limit: 5,
    ignore: ["node_modules"],
});
```

## Scores, limits and filters

```js
const results = await simpleFolderSearch("./music", [".mp3"], "my song", {
    includeScores: true, // [{ path, score, name, folder }]
    minimumScore: 0.7,
    limit: 10,
    maxDepth: 2,
    ignoreHidden: true,
    weights: { name: 3, folder: 1 },
});
```

See [Options](options.md) for all options.

## Reusable index

If you search the same folder many times (a bot command, an autocomplete box), scan it once:

```js
import { createSearchIndex } from "simple-folder-search";

const index = await createSearchIndex("./music", [".mp3", ".wav"], { ignoreHidden: true });

index.search("my song");                               // string[], no disk access
index.search("my song", { limit: 5, includeScores: true });
console.log(index.size);                               // number of indexed files

await index.refresh();                                 // re-scan after files changed
```

## Listing files

`scanFiles` returns every matching file, sorted, without fuzzy matching. It accepts the [scan options](options.md#scanning):

```js
import { scanFiles } from "simple-folder-search";

const files = await scanFiles("./music", [".mp3"], { maxDepth: 1, ignore: ["*.part"] });
```

## Searching your own list

`searchCandidates` fuzzy-searches a list you already have:

```js
import { searchCandidates } from "simple-folder-search";

const results = await searchCandidates(
    [{ name: "my song", folder: "Artist", path: "/music/Artist/my song.mp3" }],
    "my song",
    0.6,                // minimumScore
    { limit: 5 },       // optional matcher / query options
);
```

## Example: playing a file with discord-player

```js
const { simpleFolderSearch } = require("simple-folder-search");
const { Player, QueryType } = require("discord-player");

const player = new Player(client);

const [firstMatch] = await simpleFolderSearch("./music", [".mp3", ".wav"], "my song", { limit: 1 });

if (firstMatch) {
    const research = await player.search(firstMatch, { searchEngine: QueryType.FILE });
    await player.play(voiceChannel, research);
} else {
    console.log("No matching files found");
}
```

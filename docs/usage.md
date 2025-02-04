# Usage

Here is an example of how to use the package to search for files and play a file using `discord-player`'s search method:

```javascript
const { simpleFolderSearch } = require('simple-folder-search');
const { Player, QueryType } = require('discord-player');

// Initialize the player
const player = new Player(client);

// Search for music files in your music folder
const musicFiles = await simpleFolderSearch('./music', ['.mp3', '.wav'], 'my song', { minimumScore: 0.6 });

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

## Searching by Name and Artist

You can also search for files using both the file name and the artist (folder name) by providing the search query as an array. The first element of the array should be the file name, and the second element should be the artist (folder name).

```js
const results = await simpleFolderSearch("./music", [".mp3", ".wav"], ["my song", "artist name"], { minimumScore: 0.6, batchSize: 100 });
console.log(results);
```

In this example, the search will look for files named "my song" within folders named "artist name".

## Advanced Usage

```js
const options = {
    minimumScore: 0.7,
    batchSize: 50,
    parallelSearches: 5,
};

const advancedResults = await simpleFolderSearch("./music", [".mp3", ".wav"], "advanced search", options);
console.log(advancedResults);
```

In this example, the search will look for files with a minimum score of 0.7, process 50 files at a time and perform 5 parallel searches.
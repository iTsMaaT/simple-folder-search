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
const simpleFolderSearch = require('simple-folder-search');
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

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.
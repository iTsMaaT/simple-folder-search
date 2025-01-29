# Simple Folder Search

This package provides a simple way to search for files within a folder. It is designed to be easy to use and integrate into your projects.

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
const { searchFiles } = require('simple-folder-search');
const { Player } = require('discord-player');

// Initialize the player
const player = new Player(client);

// Search for files in a directory
const files = searchFiles('path/to/your/folder', { extension: '.mp3' });

// Use discord-player to search and play a file
async function playFile(query) {
    const searchResult = await player.search(query, {
        requestedBy: message.author,
        searchEngine: 'youtube' // or 'soundcloud'
    });

    if (!searchResult || !searchResult.tracks.length) {
        return message.channel.send('No results found!');
    }

    const track = searchResult.tracks[0];
    player.play(message.member.voice.channel, track, message.member.user);
}

// Example usage
playFile(files[0]);
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

## Contact

For any questions or inquiries, please contact [your-email@example.com].

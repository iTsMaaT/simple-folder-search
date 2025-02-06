# Simple Folder Search

Simple Folder Search is a package that provides a simple way to search for files within a folder. It is designed to be easy to use and integrate into your projects.

## Installation

To install the package, use the following command:

```bash
npm install simple-folder-search
```

You can also install it using yarn:

```bash
yarn add simple-folder-search
```

## Usage

Here is a basic example of how to use the package:

```javascript
const { simpleFolderSearch } = require('simple-folder-search');

const results = await simpleFolderSearch('./music', ['.mp3', '.wav'], 'my song', { minimumScore: 0.6 });
console.log(results);
```

For more detailed usage and advanced options, please refer to the [Usage Documentation](docs/usage.md).

## Documentation

For detailed documentation, please refer to the following files:

- [Installation](docs/installation.md)
- [Usage](docs/usage.md)
- [Options](docs/options.md)
- [Custom Caching](docs/caching.md)
- [Types](docs/types.md)

## License

This project is licensed under the MIT License.
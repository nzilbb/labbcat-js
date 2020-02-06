# labbcat-js

Client library for communicating with LaBB-CAT servers.

This is both a node module and a browser-importable script (nzilbb.labbcat.js) that
provides functionality for querying and extracting data from LaBB-CAT corpora, directly
from JavaScript.

## Documentation

Detailed documentation is available [here](https://nzilbb.github.io/labbcat-js/)

## Running unit tests

```
npm test
```

## Generating documentation

Documentation is generated using *jsdoc*, which you must install first:

```
npm install -g jsdoc
```

Once *jsdoc* has been installed, you can generate the documentation, which is saved in the
`docs` subdirectory, using:

```
npm run docs
```

# labbcat-js

Client library for communicating with LaBB-CAT servers.

This is both a node module and a browser-importable script (nzilbb.labbcat.js) that
provides functionality for querying and extracting data from LaBB-CAT corpora, directly
from JavaScript.

## Basic usage

The following example shows how to perform a search and download audio and Praat TextGrids
for the results.

```javascript
const labbcat = require("@nzilbb/labbcat");

const corpus = new labbcat.Labbcat("https://sometld.com", "your username", "your password");

// get the first participant in the corpus
corpus.getParticipantIds((ids, errors, messages)=>{
    const participantId = ids[0];
    
    // all their instances of "the" followed by a word starting with a vowel
    const pattern = [
        {"orthography" : "i"},
        {"phonemes" : "[cCEFHiIPqQuUV0123456789~#\\$@].*"}];
    
    // start searching
    corpus.search(pattern, [ participantId ], false, (response, errors, messages)=>{
        const taskId = response.threadId
                
        // wait for the search to finish
        corpus.waitForTask(taskId, 30, (task, errors, messages)=>{
            
            // get the matches
            corpus.getMatches(taskId, (result, errors, messages)=>{
                const matches = result.matches;
                console.log("There were " + matches.length + " matches for " + participantId);
                
                // get TextGrids of the utterances
                corpus.getFragments(
                    matches, [ "orthography", "phonemes" ], "text/praat-textgrid",
                    (textgrids, errors, messages)=>{
                        
                        for (let textgrid of textgrids) {
                            console.log(textgrid);
                        }
                        
                        // get the utterance recordings
                        corpus.getSoundFragments(matches, (wavs, errors, messages)=>{
                            
                            for (let wav of wavs) {
                                console.log(wav);
                            }
                        });
                    });
            });
        });
    });
});
```

## Documentation

Detailed documentation is available [here](https://nzilbb.github.io/labbcat-js/)

## Developers

### Running unit tests

```
npm test
```

### Generating documentation

Documentation is generated using *jsdoc*, which you must install first:

```
npm install -g jsdoc
```

Once *jsdoc* has been installed, you can generate the documentation, which is saved in the
`docs` subdirectory, using:

```
npm run docs
```

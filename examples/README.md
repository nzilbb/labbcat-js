# Example Scripts

Here are some example scripts illustrating how the module can be used.

e.g. *batchupload.js* is a script that will recursively crawl over the local directory
looking for transcripts and media, and uploading them to LaBB-CAT.

To use this script:

1. Run `npm install "@nzilbb/labbcat"`
2. Edit the script to change the following variables:
  - ext = transcript file extension to look for
  - labbcatUrl = LaBB-CAT "home" URL
  - userName = LaBB-CAT username
  - password = LaBB-CAT password
  - corpus = corpus to upload into
  - transcriptType = transcript type to use


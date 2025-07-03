# 1.8.0

- New LabbcatView functions:
  + *changePassword* - change the current user's password

Requires LaBB-CAT version 202500703.1313

# 1.7.0

- New LabbcatEdit functions for phased uploading of transcripts:
  + transcriptUpload - phase 1: upload a transcript file and associated media files
  + transcriptUploadParameters - phase 2: specify parameters for processing upladed trascript

Requires LaBB-CAT version 20250430.1200

# 1.6.0

- New LabbcatView function
  + *aggregateMatchingAnnotations* - Identifies a list of annotations and aggregates their labels
- New LabbcatEdit functions
  + *saveMedia* - saves the given media for the given transcript.
  + *saveEpisodeDocument* - adds the given document to the given transcript's episode documents.
  + *deleteMedia* - deletes media or episode document files.
- Changed LabbcatEdit function
  + GraphStore.newTranscript: rename mediaSuffix paramater as trackSuffix.
  
# 1.5.0

- New LabbcatEdit functions
  + *versionInfo* - gets version information of all components of LaBB-CAT
  + *saveParticipant* - add or update a participant record
  + *saveTranscript* - update transcript attributes
- New LabbcatView function
  + *readOnlyCategories* - lists attribute categories for read-only users

Requires LaBB-CAT version 20230508.1434

# 1.4.0

- Changed LabbcatView functions
  + *countAnnotations* - new maxOrdinal parameter
  + *getAnnotations* - new maxOrdinal parameter
  + *updateTranscript* - new suppressGeneration parameter

Requires LaBB-CAT version 20230202.1600

# v1.3.0

- New LabbcatView functions
  + *praat* - Process with Praat functionality, including formants with FastTrack.
  + *allUtterances* - Gets all utterances of given participants.
  
# v1.2.0

- Add LabbcatAdmin class with CRUD functions for
  + corpora
  + projects
  + roles
  + system attributes (RU operations only)
  + *saveLayer* (CU operations)
- New LabbcatView functions
  + *getSerializerDescriptors*
  + *getDeserializerDescriptors*
  + *getSystemAttribute*
  + *getUserInfo*

# v1.1.2

Make *newTranscript* parameters *mediaSuffix* and *episode* optional.

# v1.1.1

Refactored to remove confusing terminology and use class names that reflect LaBB-CAT user
authorization level. 

# v1.1.0

Includes:

- support for LaBB-CAT version 20200608.1507 API
- Labbcat.getTranscriptAttributes
- Labbcat.getParticipantAttributes

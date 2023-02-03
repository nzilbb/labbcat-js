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

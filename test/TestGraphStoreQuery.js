'use strict';

/**
 * Unit tests for GraphStoreQuery.
 * <p>These tests test the functionality of the client library, not the server. 
 * <p>They assume the existence of a valid LaBB-CAT instance (configured by
 * <var>labbcatUrl</var>) which responds correctly to requests, but do not generally test
 * that the server behaves correctly , nor assume specific corpus content. For the tests
 * to work, the first graph listed in LaBB-CAT must have some words and some media, and
 * the first participant listed must have some transcripts. 
 */

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');

// YOU MUST ENSURE THE FOLLOWING SETTINGS ARE VALID FOR YOU TEST LABBCAT SERVER:
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var store = null; 

describe("#GraphStoreQuery", function() {
    before((done)=>{
        store = new labbcat.GraphStoreQuery(baseUrl, username, password);
        store.getId((id, errors, messages)=>{
            assert.isNull(
                errors, "\nCould not connect to LaBB-CAT."
                    +"\nThese unit tests require a running LaBB-CAT server to test against."
                    +"\nPlease check the baseUrl variable refers to a running LaBB-CAT server.");
            done();
        });
    });
    beforeEach((done)=>{
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        done();
    });
    
    it("implements getId", (done)=>{
        store.getId((id, errors, messages)=>{
            assert.isNull(errors);
            assert.equal(id, baseUrl);
            done();
        });
    });
    
    it("implements getLayerIds", (done)=>{
        //labbcat.verbose = true;
        store.getLayerIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            //for (let id of ids) console.log("layer " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            assert.include(ids, "transcript", "Has transcript layer");
            assert.include(ids, "turns", "Has turns layer");
            assert.include(ids, "utterances", "Has utterances layer");
            assert.include(ids, "transcript_type", "Has transcript_type layer");
            done();
        });
    });
    
    it("implements getLayers", (done)=>{
        store.getLayers((layers, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(layers);
            //for (let layer of layers) console.log("layer " + layer.id);
            assert.isNotEmpty(layers, "Some IDs are returned");
            const ids = layers.map(layer => layer.id);
            assert.include(ids, "transcript", "Has transcript layer");
            assert.include(ids, "turns", "Has turns layer");
            assert.include(ids, "utterances", "Has utterances layer");
            assert.include(ids, "transcript_type", "Has transcript_type layer");
            done();
        });
    });
    
    it("implements getCorpusIds", (done)=>{
        store.getCorpusIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("corpus " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            done();
        });
    });

    it("implements getParticipantIds", (done)=>{
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("participant " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            done();
        });
    });

    it("implements getGraphIds", (done)=>{
        store.getGraphIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("graph " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            done();
        });
    });

    it("implements countMatchingParticipantIds", (done)=>{
        store.countMatchingParticipantIds("id MATCHES '.+'", (count, errors, messages)=>{
            assert.isNull(errors);
            assert.isNumber(count);
            assert.isAtLeast(count, 1, "There are some matches");
            done();
        });
    });
    
    it("implements getMatchingParticipantIds", (done)=>{
        store.getMatchingParticipantIds("id MATCHES '.+'", (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("participant " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            if (ids.length < 2) {
                console.log("Too few participants to test pagination");
                done();
            } else {
                store.getMatchingParticipantIds("id MATCHES '.+'", 2, 0, (ids, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isArray(ids);
                    assert.equal(ids.length, 2, "Two IDs are returned");
                    done();
                });
            }
        });
    });
    
    it("implements getGraphIdsInCorpus", (done)=>{
        store.getCorpusIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one corpus");
            store.getGraphIdsInCorpus(ids[0], (ids, errors, messages)=>{
                assert.isNull(errors);
                assert.isArray(ids);
                // for (let id of ids) console.log("graph " + id);
                assert.isNotEmpty(ids, "Some IDs are returned");
                done();
            });
        });
    });

    it("implements getGraphIdsWithParticipant", (done)=>{
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one participant");
            store.getGraphIdsWithParticipant(ids[0], (ids, errors, messages)=>{
                assert.isNull(errors);
                assert.isArray(ids);
                // for (let id of ids) console.log("graph " + id);
                assert.isNotEmpty(ids, "Some IDs are returned");
                done();
            });
        });
    });

    it("implements countMatchingGraphIds", (done)=>{
        store.countMatchingGraphIds("id MATCHES '.+'", (count, errors, messages)=>{
            assert.isNull(errors);
            assert.isNumber(count);
            assert.isAtLeast(count, 1, "There are some matches");
            done();
        });
    });
    
    it("implements getMatchingGraphIds", (done)=>{
        store.getMatchingGraphIds("id MATCHES '.+'", (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("participant " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            if (ids.length < 2) {
                console.log("Too few graphs to test pagination");
                done();
            } else {
                store.getMatchingGraphIds("id MATCHES '.+'", 2, 0, (ids, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isArray(ids);
                    assert.equal(ids.length, 2, "Two IDs are returned");
                    done();
                });
            }
        });
    });
    
    it("implements countAnnotations", (done)=>{
        store.getMatchingGraphIds("id MATCHES '.+'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one graph");
            store.countAnnotations(ids[0], "orthography", (count, errors, messages)=>{
                assert.isNull(errors);
                assert.isNumber(count);
                assert.isAtLeast(count, 1, "There are some matches");
                done();
            });
        });
   });

    it("implements getAnnotations", (done)=>{
        store.getMatchingGraphIds("id MATCHES '.+'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one graph");
            let graphId = ids[0];
            
            store.countAnnotations(graphId, "orthography", (count, errors, messages)=>{
                assert.isNull(errors);
                assert.isAtLeast(count, 2, "There are at least two annotations");
                store.getAnnotations(
                    graphId, "orthography", 2, 0, (annotations, errors, messages)=>{
                        assert.isNull(errors);
                        assert.isArray(annotations);
                        assert.equal(annotations.length, 2, "Two annotations are returned");
                        let annotation = annotations[0];
                        assert.containsAllKeys(
                            annotation, ["id", "label", "startId", "endId"],
                            "Looks like an annotation");
                        done();
                    });
            });
        });
    });
    
    it("implements getAnchors", (done)=>{
        // get a graph to work with
        store.getMatchingGraphIds("id MATCHES '.+'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some graph IDs are returned");
            const graphId = ids[0];
            
            // get some annotations so we have valid anchor IDs
            store.getAnnotations(graphId, "orthography", 2, 0, (annotations, errors, messages)=>{
                assert.isNull(errors);
                assert.isNotEmpty(annotations, "Some annotations are returned");
                // create an array of anchorIds
                const anchorIds = annotations.map(a=>a.startId);

                // finally, get the anchors
                store.getAnchors(graphId, anchorIds, (anchors, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isArray(anchors);
                    assert.equal(anchors.length, anchorIds.length,
                                 "Correct number of anchors is returned");
                    let anchor = anchors[0];
                    assert.containsAllKeys(
                        anchor, ["id", "offset", "confidence"],
                        "Looks like an anchor");
                    done();
                });
            });
        });
    });
   
    it("implements getMedia", (done)=>{
        store.getMatchingGraphIds("id MATCHES 'Agnes.+\\.trs'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some graph IDs are returned - maybe check the MATCHES pattern?");
            let graphId = ids[0];
            store.getMedia(graphId, "", "audio/wav", (url, errors, messages)=>{
                assert.isNull(errors);
                assert.isString(url);
                assert.include(url, baseUrl, "URL looks right: " + url);
                done();
            });
        });
    });

    it("implements getMediaFragment", (done)=>{
        store.getMatchingGraphIds("id MATCHES 'Agnes.+\\.trs'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some graph IDs are returned - maybe check the MATCHES pattern?");
            const graphId = ids[0];
            store.getMedia(graphId, "", "audio/wav", 1.0, 2.0, (url, errors, messages)=>{
                assert.isNull(errors);
                assert.isString(url);
                assert.include(url, baseUrl, "URL looks right: " + url);
                done();
            });
        });
    });

    it("implements getLayer", (done)=>{
        store.getLayer("orthography", (layer, errors, messages)=>{
            assert.isNull(errors);
            assert.equal("orthography", layer.id, "Correct layer");
            assert.containsAllKeys(
                layer, ["id", "description", "parentId", "peers", "peersOverlap"],
                "Looks like a layer");
            done();
        });
   });

    it("implements getParticipant", (done)=>{
        // find a participant ID to use
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            store.getParticipant(participantId, (participant, errorrs, messages)=>{
                assert.isNull(errors);
                assert.equal(participant.label, participantId, "Correct participant"); // not getId()
                assert.containsAllKeys(
                    participant, ["id", "label"],
                    "Looks like an annotation");
                done();
            });
        });
    });

    it("implements countMatchingAnnotations", (done)=>{
        store.countMatchingAnnotations(
            "layer.id = 'orthography' AND label MATCHES 'and'", (count, errors, messages)=>{
                assert.isNull(errors);
                assert.isNumber(count);
                assert.isAtLeast(count, 1, "There are some matches");
                done();
            });
    });
    
    it("implements getMatchingAnnotations", (done)=>{
      store.getMatchingAnnotations(
          "layer.id = 'orthography' AND label MATCHES 'and'", 2, 0,
          (annotations, errors, messages) =>{
              assert.isNull(errors);
              assert.isArray(annotations);
              assert.equal(annotations.length, 2, "Two annotations are returned");
              let annotation = annotations[0];
              assert.containsAllKeys(
                  annotation, ["id", "label", "startId", "endId"],
                  "Looks like an annotation");
              done();
          });
    });
        
    it("implements getMediaTracks", (done)=>{
        store.getMediaTracks((tracks, errors, messages)=> {
            assert.isNull(errors);
            assert.isArray(tracks);
            //for (let track of tracks) console.log("track " + JSON.stringify(track));
            assert.isNotEmpty(tracks, "Some tracks are returned");
            let track = tracks[0];
              assert.containsAllKeys(track, ["suffix", "description"], "Looks like a track");
              done();
        });
    });
   
    it("implements getAvailableMedia", (done)=>{
        // get a graph to work with
        store.getMatchingGraphIds("id MATCHES '.+'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some graph IDs are returned");
            const graphId = ids[0];
            
            store.getAvailableMedia(graphId, (files, errors, messages)=>{
                assert.isNull(errors);
                assert.isNotEmpty(files, graphId + " has some media");
                let file = files[0];
                assert.containsAllKeys(
                    file, ["name", "mimeType", "url", "trackSuffix"], "Looks like a MediaFile");
                done();
            });
        });
    });
   
    it("implements getEpisodeDocuments", (done)=>{
        // get a graph to work with
        store.getMatchingGraphIds("id MATCHES '.+'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some graph IDs are returned");
            const graphId = ids[0];
            
            store.getEpisodeDocuments(graphId, (files, errors, messages)=>{
                assert.isNull(errors);
                if (files.length == 0) {
                    console.warn(
                        graphId + " has no documents, can't test for well-formed response");
                } else {                
                    let file = files[0];
                    assert.containsAllKeys(
                        file, ["name", "mimeType", "url", "trackSuffix"],
                        "Looks like a MediaFile");
                }
                done();
            });
        });
   });

});

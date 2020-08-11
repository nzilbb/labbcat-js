'use strict';

/**
 * Unit tests for LabbcatView.
 * <p>These tests test the functionality of the client library, not the server. 
 * <p>They assume the existence of a valid LaBB-CAT instance (configured by
 * <var>labbcatUrl</var>) which responds correctly to requests, but do not generally test
 * that the server behaves correctly , nor assume specific corpus content. For the tests
 * to work, the first graph listed in LaBB-CAT must have some words and some media, and
 * the first participant listed must have some transcripts. 
 */

const assert = require('chai').assert;
const fs = require('fs');
const labbcat = require('../nzilbb.labbcat');

// YOU MUST ENSURE THE FOLLOWING SETTINGS ARE VALID FOR YOU TEST LABB-CAT SERVER:
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var store = null; 

describe("#LabbcatView", function() {
    // waitForTask and getMatches can take a few seconds
    this.timeout(45000);

    before((done)=>{
        store = new labbcat.LabbcatView(baseUrl, username, password);
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
    
    it("handles invalid credentials", (done)=>{
        let testStore = new labbcat.LabbcatView(baseUrl, username, "wrong password");
        testStore.getId((id, errors, messages)=>{
            assert.isNotNull(errors, "Requires username and password");
            assert.isTrue(errors[0].endsWith("401"),
                          "HTTP status is returned in error: " + JSON.stringify(errors));
            done();
        });
    });

    it("implements getId", (done)=>{
        assert.equal(baseUrl + "api/store/", store.storeUrl);
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

    it("implements getTranscriptIds", (done)=>{
        store.getTranscriptIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("graph " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            done();
        });
    });

    it("implements countMatchingParticipantIds", (done)=>{
        store.countMatchingParticipantIds("/.+/.test(id)", (count, errors, messages)=>{
            assert.isNull(errors);
            assert.isNumber(count);
            assert.isAtLeast(count, 1, "There are some matches");
            done();
        });
    });
    
    it("implements getMatchingParticipantIds", (done)=>{
        store.getMatchingParticipantIds("/.+/.test(id)", (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("participant " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            if (ids.length < 2) {
                console.log("Too few participants to test pagination");
                done();
            } else {
                store.getMatchingParticipantIds("/.+/.test(id)", 2, 0, (ids, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isArray(ids);
                    assert.equal(ids.length, 2, "Two IDs are returned");
                    done();
                });
            }
        });
    });
    
    it("implements getTranscriptIdsInCorpus", (done)=>{
        store.getCorpusIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one corpus");
            store.getTranscriptIdsInCorpus(ids[0], (ids, errors, messages)=>{
                assert.isNull(errors);
                assert.isArray(ids);
                // for (let id of ids) console.log("graph " + id);
                assert.isNotEmpty(ids, "Some IDs are returned");
                done();
            });
        });
    });

    it("implements getTranscriptIdsWithParticipant", (done)=>{
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one participant");
            store.getTranscriptIdsWithParticipant(ids[0], (ids, errors, messages)=>{
                assert.isNull(errors);
                assert.isArray(ids);
                // for (let id of ids) console.log("graph " + id);
                assert.isNotEmpty(ids, "Some IDs are returned");
                done();
            });
        });
    });

    it("implements countMatchingTranscriptIds", (done)=>{
        store.countMatchingTranscriptIds("/.+/.test(id)", (count, errors, messages)=>{
            assert.isNull(errors);
            assert.isNumber(count);
            assert.isAtLeast(count, 1, "There are some matches");
            done();
        });
    });
    
    it("implements getMatchingTranscriptIds", (done)=>{
        store.getMatchingTranscriptIds("/.+/.test(id)", (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(ids);
            // for (let id of ids) console.log("transcript " + id);
            assert.isNotEmpty(ids, "Some IDs are returned");
            if (ids.length < 2) {
                console.log("Too few transcripts to test pagination");
                done();
            } else {
                store.getMatchingTranscriptIds("/.+/.test(id)", 2, 0, (ids, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isArray(ids);
                    assert.equal(ids.length, 2, "Two IDs are returned");
                    done();
                });
            }
        });
    });
    
    it("implements countAnnotations", (done)=>{
        store.getMatchingTranscriptIds("/.+/.test(id)", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one transcript");
            store.countAnnotations(ids[0], "orthography", (count, errors, messages)=>{
                assert.isNull(errors);
                assert.isNumber(count);
                assert.isAtLeast(count, 1, "There are some matches");
                done();
            });
        });
    });

    it("implements getAnnotations", (done)=>{
        store.getMatchingTranscriptIds("/.+/.test(id)", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isAtLeast(ids.length, 1, "There's at least one transcript");
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
        store.getMatchingTranscriptIds("/.+/.test(id)", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned");
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
        store.getMatchingTranscriptIds("/AP511.+\\.eaf/.test(id)'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned - maybe check the test regex?");
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
        store.getMatchingTranscriptIds("/AP511.+\\.eaf/.test(id)'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned - maybe check the test regex?");
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
            "layer.id == 'orthography' && label == 'and'", (count, errors, messages)=>{
                assert.isNull(errors);
                assert.isNumber(count);
                assert.isAtLeast(count, 1, "There are some matches");
                done();
            });
    });
    
    it("implements getMatchingAnnotations", (done)=>{
        store.getMatchingAnnotations(
            "layer.id == 'orthography' && label == 'and'", 2, 0,
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
        store.getMatchingTranscriptIds("/.+/.test(id)", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned");
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
        store.getMatchingTranscriptIds("/.+/.test(id)", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned");
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

    it("implements getTasks", (done)=>{
        store.getTasks((tasks, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isObject(tasks);
            // not sure what we expect, but let's just print out what we got
            if (Object.keys(tasks).length == 0) {
                console.warn("There are no tasks, can't test for well-formed response.");
            } else {
                const firstTaskId = Object.keys(tasks)[0];
                const task = tasks[firstTaskId];
                assert.containsAllKeys(
                    task, ["threadId", "threadName", "running", "percentComplete", "status"],
                    "Looks like a MediaFile");
            }
            done();
        });
    });

    it("implements taskStatus", (done)=>{
        // first get a list of tasks
        store.getTasks((tasks, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            if (Object.keys(tasks).length == 0) {
                console.warn("There are no tasks, so can't test getTask.");
                done();
            } else {
                const threadId = Object.keys(tasks)[0];
                store.taskStatus(threadId, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors))
                    assert.isNotNull(task);
                    assert.isObject(task);
                    assert.equal(threadId, task.threadId, "Correct task");
                    assert.containsAllKeys(
                        task, ["threadId", "threadName", "running", "percentComplete", "status"],
                        "Looks like a MediaFile");
                    done();
                });
            }
        });
    });

    it("implements waitForTask", (done)=>{
        // first get a list of tasks
        store.getTasks((tasks, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            if (Object.keys(tasks).length == 0) {
                console.warn("There are no tasks, so can't test getTask.");
                done();
            } else {
                const threadId = Object.keys(tasks)[0];
                store.waitForTask(threadId, 1, (task, errors, messages)=>{
                    assert.equal(threadId, task.threadId, "Correct task");
                    assert.containsAllKeys(
                        task, ["threadId", "threadName", "running", "percentComplete", "status"],
                        "Looks like a MediaFile");
                    done();
                });
            }
        });
    });
    
    it("fails with getTask and invalid numeric id", (done)=>{
        store.taskStatus(9999, (result, errors, messages)=>{
            assert.isNotNull(errors);
            // console.log(errors[0]);
            done();
        });
    });

    it("fails with getTask and invalid alphabetic id", (done)=>{
        store.taskStatus("invalid taskId", (result, errors, messages)=>{
            assert.isNotNull(errors);
            // console.log(errors[0]);
            done();
        });
    });
    
    it("fails with search and invalid pattern", (done)=>{
        store.search({}, null, false, (response, errors, messages)=>{
            assert.isNotNull(errors, JSON.stringify(errors))
            done();
        });
    });
    
    it("implements search and cancelTask", (done)=>{
        // start a long-running search - all words
        const pattern = {"columns" : [{
            "layers" : {
                "orthography" : { "pattern" : ".*"}}}]};
        
        store.search(pattern, null, false, (response, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isNotNull(response, JSON.stringify(errors))
            assert.isObject(response, JSON.stringify(errors))
            const threadId = response.threadId
            assert.isNotNull(threadId);
            
            store.cancelTask(threadId, (result, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))

                setTimeout(()=>{ // wait a second to give it a chance to stop
                    // ensure task is no longer running
                    store.taskStatus(threadId, (task, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        assert.isNotNull(task);
                        assert.isFalse(task.running);
                        store.releaseTask(threadId);
                        done();
                    });
                }, 1000);
            });
        });
    });
    
    it("implements search, getMatches and getMatchAnnotations", (done)=>{
        // get a participant ID to use
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];

            // all instances of "and"
            const pattern = {"columns" : [{
                "layers" : {
                    "orthography" : { "pattern" : "i"}}}]};
            store.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const threadId = response.threadId

                store.waitForTask(threadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) store.cancelTask(threadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    store.getMatches(threadId, 2, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isArray(result.matches)
                        assert.isAtLeast(matches.length, 1,
                                         "getMatches: No matches were returned,"
                                         +" cannot test getMatchAnnotations");
                        const pageLength = Math.min(5, matches.length);
                        
                        store.getMatches(threadId, 2, pageLength, 0, (result, errors, messages)=>{
                            assert.isNull(errors, "Pagination works: " + JSON.stringify(errors))
                            assert.isNotNull(result)
                            assert.isNotNull(result.name)
                            const matches = result.matches;
                            assert.isArray(result.matches)
                            assert.equal(matches.length, pageLength, "page length correct");
                            
                            const layerIds = [ "orthography" ];
                            const matchIds = matches.map(match => match.MatchId);
                            store.getMatchAnnotations(
                                matchIds, layerIds, 0, 1, (annotations, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(annotations)
                                    assert.isArray(annotations, JSON.stringify(annotations));
                                    
                                    assert.equal(matchIds.length, annotations.length,
                                                 "annotations array is same size as matches");
                                    assert.equal(1, annotations[0].length,
                                                 "row arrays are the right size");
                                    
                                    let annotation = annotations[0][0];
                                    assert.containsAllKeys(
                                        annotation, ["id", "label", "startId", "endId"],
                                        "Looks like an annotation");
                                    
                                    // ensure we can also pass in a list of matches
                                    store.getMatchAnnotations(
                                        matches, layerIds, 0, 1, (annotations, errors, messages)=>{
                                            assert.isNull(
                                                errors,
                                                "Using matches instead of MatchIds works "
                                                    +JSON.stringify(errors))
                                            assert.isNotNull(annotations)
                                            assert.isArray(annotations,
                                                           JSON.stringify(annotations));
                                            
                                            assert.equal(
                                                matchIds.length, annotations.length,
                                                "annotations array is same size as matches array");
                                            assert.equal(1, annotations[0].length,
                                                         "row arrays are the right size");
                                            
                                            let annotation = annotations[0][0];
                                            assert.containsAllKeys(
                                                annotation, ["id", "label", "startId", "endId"],
                                                "Looks like an annotation");
                                            
                                            store.releaseTask(threadId);
                                            done();
                                        });
                                });
                        });
                    });
                });
            });
        });
    });
    
    it("implements abbreviated search patterns", (done)=>{
        // get a participant ID to use
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "and"
            const fullPattern = {"columns" : [{
                "layers" : {
                    "orthography" : { "pattern" : "i"}}}]};
            store.search(fullPattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const unabbreviatedThreadId = response.threadId

                store.waitForTask(unabbreviatedThreadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) store.cancelTask(unabbreviatedThreadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    store.getMatches(unabbreviatedThreadId, 2, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const unabbreviatedMatches = result.matches;
                        assert.isArray(unabbreviatedMatches)

                        // try again with abbreviated syntax...
                        
                        // all instances of "and"
                        const abbreviatedPattern = {"orthography" : "i"};
                        store.search(
                            abbreviatedPattern, [ participantId ], false,
                            (response, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(response)
                                assert.isObject(response)
                                const abbreviatedThreadId = response.threadId
                                
                                store.waitForTask(
                                    abbreviatedThreadId, 30, (task, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors));
                                        
                                        // if the task is still running, it's taking too long, so cancel it
                                        if (task.running) store.cancelTask(abbreviatedThreadId);
                                        assert.isFalse(
                                            task.running,
                                            "Second search finished in a timely manner");
                                        
                                        store.getMatches(
                                            abbreviatedThreadId, 2, (result, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(result)
                                                assert.isNotNull(result.name)
                                                const abbreviatedMatches = result.matches;
                                                assert.isArray(abbreviatedMatches)

                                                assert.equal(
                                                    abbreviatedMatches.length,
                                                    unabbreviatedMatches.length,
                                                    "abbreviated an unabbreviated patterns return the same number of results");

                                                // be tidy
                                                store.releaseTask(unabbreviatedThreadId); 
                                                store.releaseTask(abbreviatedThreadId);
                                                
                                                done();
                                            });
                                    });
                            });
                    });
                });
            });
        });
    });
    
    it("implements getSoundFragments", (done)=>{
        // get a participant ID to use
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "I"
            const pattern = {"orthography" : "i"};
            store.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const threadId = response.threadId

                store.waitForTask(threadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) store.cancelTask(threadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");
                    
                    store.getMatches(threadId, 5, 0, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");
                        
                        store.releaseTask(threadId);
                        
                        // convert MatchIds to arrays of individual Ids
                        const graphIds = matches.map(match => match.Transcript);
                        const startOffsets = matches.map(match => match.Line);
                        const endOffsets = matches.map(match => match.LineEnd);

                        // getSoundFragments with all parameters
                        store.getSoundFragments(
                            graphIds, startOffsets, endOffsets, 16000, "test",
                            (wavs, errors, messages)=>{
                                assert.isNull(errors, "getSoundFragments all params: "
                                              +JSON.stringify(errors))
                                assert.equal(matches.length, wavs.length,
                                             "files array is same size as matches array");
                                
                                for (let m = 0; m < matches.length; m++) {
                                    // console.log(wavs[m]);
                                    assert.isNotNull(wavs[m],
                                                     "Non-null file: " + matches[m]);
                                    assert.isTrue(fs.existsSync(wavs[m]),
                                                  "File exists: " + wavs[m]
                                                  + " : " + JSON.stringify(matches[m]));
                                    assert.isAbove(fs.statSync(wavs[m]).size, 0,
                                                   "Non-zero sized file: " + matches[m]);
                                } // next file
                                // some fragments might be repeated, so we delete the
                                // files only after all checks are complete
                                for (let m = 0; m < matches.length; m++) {
                                    try { fs.unlinkSync(wavs[m]); } catch(x) {}
                                }

                                // getSoundFragments without dir
                                store.getSoundFragments(
                                    graphIds, startOffsets, endOffsets, 16000,
                                    (wavs, errors, messages)=>{
                                        assert.isNull(errors, "getSoundFragments without dir: "
                                                      +JSON.stringify(errors))
                                        assert.equal(matches.length, wavs.length,
                                                     "files array is same size as matches array");
                                        
                                        for (let m = 0; m < matches.length; m++) {
                                            // console.log(wavs[m]);
                                            assert.isNotNull(wavs[m],
                                                             "Non-null file: " + matches[m]);
                                            assert.isTrue(fs.existsSync(wavs[m]),
                                                          "File exists: " + matches[m]);
                                            assert.isAbove(fs.statSync(wavs[m]).size, 0,
                                                           "Non-zero sized file: " + matches[m]);
                                        } // next file
                                        // some fragments might be repeated, so we delete the
                                        // files only after all checks are complete
                                        for (let m = 0; m < matches.length; m++) {
                                            try { fs.unlinkSync(wavs[m]); } catch(x) {}
                                        }
                                        
                                        // getSoundFragments without sampleRate
                                        store.getSoundFragments(
                                            graphIds, startOffsets, endOffsets,
                                            (wavs, errors, messages)=>{
                                                assert.isNull(
                                                    errors, "getSoundFragments no sampleRate: "
                                                        +JSON.stringify(errors))
                                                assert.equal(
                                                    matches.length, wavs.length,
                                                    "files array is same size as matches array");
                                                
                                                for (let m = 0; m < matches.length; m++) {
                                                    // console.log(wavs[m]);
                                                    assert.isNotNull(
                                                        wavs[m],
                                                        "Non-null file: " + matches[m]);
                                                    assert.isTrue(fs.existsSync(wavs[m]),
                                                                  "File exists: " + matches[m]);
                                                    assert.isAbove(
                                                        fs.statSync(wavs[m]).size, 0,
                                                        "Non-zero sized file: " + matches[m]);
                                                } // next file
                                                // some fragments might be repeated, so we
                                                // delete the files only after all checks
                                                // are complete
                                                for (let m = 0; m < matches.length; m++) {
                                                    try { fs.unlinkSync(wavs[m]); } catch(x) {}
                                                }
                                                
                                                // getSoundFragments with matches instead of
                                                // graphIds, startOffsets, and endOffsets
                                                store.getSoundFragments(
                                                    matches, (wavs, errors, messages)=>{
                                                        assert.isNull(
                                                            errors, "getSoundFragments w matches: "
                                                                +JSON.stringify(errors))
                                                        assert.equal(
                                                            matches.length, wavs.length,
                                                            "files array is same size as matches");
                                                        
                                                        for (let m = 0; m < matches.length; m++) {
                                                            // console.log(wavs[m]);
                                                            assert.isNotNull(
                                                                wavs[m],
                                                                "Non-null file: " + matches[m]);
                                                            assert.isTrue(
                                                                fs.existsSync(wavs[m]),
                                                                "File exists: " + matches[m]);
                                                            assert.isAbove(
                                                                fs.statSync(wavs[m]).size, 0,
                                                                "Non-zero sized file: "+matches[m]);
                                                        } // next file
                                                        // some fragments might be repeated,
                                                        // so we delete the files only
                                                        // after all checks are complete 
                                                        for (let m = 0; m < matches.length; m++) {
                                                            try { fs.unlinkSync(wavs[m]); } catch(x) {}
                                                        }
                                                        
                                                        done();
                                                    });
                                            });
                                    });
                            });
                    });
                });
            });
        });
    });

    it("implements getFragments", (done)=>{
        // get a participant ID to use
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "I"
            const pattern = {"orthography" : "i"};
            store.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const threadId = response.threadId
                
                store.waitForTask(threadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) store.cancelTask(threadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");
                    
                    store.getMatches(threadId, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");
                        
                        store.releaseTask(threadId);
                        
                        const upTo = Math.min(5, matches.length);
                        const subset = matches.slice(0, upTo);
                        // convert MatchIds to arrays of individual Ids
                        const graphIds = subset.map(match => match.Transcript);
                        const startOffsets = subset.map(match => match.Line);
                        const endOffsets = subset.map(match => match.LineEnd);

                        const layerIds = [ "orthography" ];
                        // getFragments with dir
                        store.getFragments(
                            graphIds, startOffsets, endOffsets, layerIds, "text/praat-textgrid",
                            "test", (textgrids, errors, messages)=>{
                                assert.isNull(errors, "getFragments with dir: "
                                              +JSON.stringify(errors))
                                assert.equal(subset.length, textgrids.length,
                                             "files array is same size as matches array");
                                
                                for (let m = 0; m < upTo; m++) {
                                    // console.log(textgrids[m]);
                                    assert.isNotNull(textgrids[m],
                                                     "Non-null file: " + subset[m]);
                                    assert.isTrue(fs.existsSync(textgrids[m]),
                                                  "File exists: " + subset[m]);
                                    assert.isAbove(fs.statSync(textgrids[m]).size, 0,
                                                   "Non-zero sized file: " + subset[m]);
                                } // next file
                                // some fragments might be repeated, so we delete the
                                // files only after all checks are complete
                                for (let m = 0; m < upTo; m++) {
                                    try { fs.unlinkSync(textgrids[m]); } catch(x) {}
                                }
                                
                                // getFragments without dir
                                store.getFragments(
                                    graphIds, startOffsets, endOffsets, layerIds,
                                    "text/praat-textgrid", (textgrids, errors, messages)=>{
                                        assert.isNull(errors, "getFragments without dir: "
                                                      +JSON.stringify(errors))
                                        assert.equal(subset.length, textgrids.length,
                                                     "files array is same size as matches array");
                                        
                                        for (let m = 0; m < upTo; m++) {
                                            // console.log(textgrids[m]);
                                            assert.isNotNull(textgrids[m],
                                                             "Non-null file: " + subset[m]);
                                            assert.isTrue(fs.existsSync(textgrids[m]),
                                                          "File exists: " + subset[m]);
                                            assert.isAbove(fs.statSync(textgrids[m]).size, 0,
                                                           "Non-zero sized file: " + subset[m]);
                                        } // next file
                                        // some fragments might be repeated, so we delete the
                                        // files only after all checks are complete
                                        for (let m = 0; m < upTo; m++) {
                                            try { fs.unlinkSync(textgrids[m]); } catch(x) {}
                                        }

                                        // getFragments with matches instead of
                                        // graphIds, startOffsets, and endOffsets
                                        store.getFragments(
                                            subset, layerIds, "text/praat-textgrid",
                                            (textgrids, errors, messages)=>{
                                                assert.isNull(errors, "getFragments with matches: "
                                                              +JSON.stringify(errors))
                                                assert.equal(
                                                    subset.length, textgrids.length,
                                                    "files array is same size as matches array");
                                                
                                                for (let m = 0; m < upTo; m++) {
                                                    // console.log(textgrids[m]);
                                                    assert.isNotNull(
                                                        textgrids[m],
                                                        "Non-null file: " + subset[m]);
                                                    assert.isTrue(fs.existsSync(textgrids[m]),
                                                                  "File exists: " + subset[m]);
                                                    assert.isAbove(
                                                        fs.statSync(textgrids[m]).size, 0,
                                                        "Non-zero sized file: " + subset[m]);
                                                } // next file
                                                // some fragments might be repeated, so we
                                                // delete the files only after all checks
                                                // are complete 
                                                for (let m = 0; m < upTo; m++) {
                                                    try { fs.unlinkSync(textgrids[m]); } catch(x) {}
                                                }
                                                
                                                done();
                                            });
                                    });
                            });
                    });
                });
            });
        });
    });

    it("implements getTranscriptAttributes", (done)=>{
        // get a list of transcripts
        store.getMatchingTranscriptIds("/BR.+/.test(id)", (transcriptIds, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(transcriptIds);
            // for (let id of transcriptIds) console.log("transcript " + id);
            assert.isNotEmpty(transcriptIds, "Some IDs are returned");
            const layerIds = ["transcript_type", "corpus"];
            const fileName = "test.csv";
            store.getTranscriptAttributes(
                transcriptIds, layerIds, fileName,
                (result, errors, messages) => {
                    assert.isNull(errors);
                    assert.equal(result, fileName);
                    assert(fs.existsSync(fileName), "Results saved");
                    fs.unlinkSync(fileName);
                    done();
                });
        });
    });
    
    it("implements getParticipantAttributes", (done)=>{
        // get a list of participants
        store.getMatchingParticipantIds("/BR.+/.test(id)", (participantIds, errors, messages)=>{
            assert.isNull(errors);
            assert.isArray(participantIds);
            // for (let id of participantIds) console.log("participant " + id);
            assert.isNotEmpty(participantIds, "Some IDs are returned");
            const layerIds = ["participant_gender", "participant_notes"];
            const fileName = "test.csv";
            store.getParticipantAttributes(
                participantIds, layerIds, fileName,
                (result, errors, messages) => {
                    assert.isNull(errors);
                    assert.equal(result, fileName);
                    assert(fs.existsSync(fileName), "Results saved");
                    fs.unlinkSync(fileName);
                    done();
                });
        });
    });
    
    it("works with the example code", (done)=>{
        
        // get the first participant in the corpus
        store.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all their instances of "the" followed by a word starting with a vowel
            const pattern = [
                {"orthography" : "i"},
                {"phonemes" : "[cCEFHiIPqQuUV0123456789~#\\$@].*"}];

            // start searching
            store.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const taskId = response.threadId
                
                // wait for the search to finish
                store.waitForTask(taskId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) store.cancelTask(taskId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    // get the matches
                    store.getMatches(taskId, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");

                        //console.log("There were " + matches.length + " matches for " + participantId);
                        
                        store.releaseTask(taskId);

                        // get TextGrids of the utterances
                        store.getFragments(
                            matches, [ "orthography", "phonemes" ], "text/praat-textgrid",
                            (textgrids, errors, messages)=>{
                                assert.isNull(errors, "getFragments with dir: "
                                              +JSON.stringify(errors))
                                assert.equal(matches.length, textgrids.length,
                                             "files array is same size as matches array");
                                
                                for (let textgrid of textgrids) {
                                    //console.log(textgrid);
                                    // be tidy
                                    fs.unlinkSync(textgrid);
                                }
                                
                                // get the utterance recordings
                                store.getSoundFragments(
                                    matches, (wavs, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors))
                                        assert.equal(
                                            matches.length, wavs.length,
                                            "files array is same size as matches");
                                        
                                        for (let wav of wavs) {
                                            //console.log(wav);
                                            // be tidy
                                            fs.unlinkSync(wav);
                                        }
                                        done();
                                    });
                            });
                    });
                });
            });
        });
    });

    it("implements getSerializerDescriptors", (done)=>{
        store.getSerializerDescriptors((descriptors, errors, messages)=> {
            assert.isNull(errors);
            assert.isArray(descriptors);
            //for (let descriptor of descriptors) console.log("descriptor " + JSON.stringify(descriptor));
            assert.isNotEmpty(descriptors, "Some descriptors are returned");
            let descriptor = descriptors[0];
            assert.containsAllKeys(
                descriptor, [
                    "name", "mimeType", "version", "icon", "numberOfInputs", "fileSuffixes",
                    "minimumApiVersion"],
                "Looks like a descriptor");
            done();
        });
    });
    
    it("implements getDeserializerDescriptors", (done)=>{
        store.getDeserializerDescriptors((descriptors, errors, messages)=> {
            assert.isNull(errors);
            assert.isArray(descriptors);
            //for (let descriptor of descriptors) console.log("descriptor " + JSON.stringify(descriptor));
            assert.isNotEmpty(descriptors, "Some descriptors are returned");
            let descriptor = descriptors[0];
            assert.containsAllKeys(
                descriptor, [
                    "name", "mimeType", "version", "icon", "numberOfInputs", "fileSuffixes",
                    "minimumApiVersion"],
                "Looks like a descriptor");
            done();
        });
    });

    it("implements getSystemAttribute", (done)=>{
        store.getSystemAttribute("title", (attribute, errors, messages)=> {
            assert.isNull(errors);
            assert.isObject(attribute);
            //console.log("attribute " + JSON.stringify(attribute));
            assert.containsAllKeys(
                attribute, ["name", "value"],
                "Looks like an attribute");
            assert.equal("title", attribute.name, "Correct attribute returned");
            done();
        });
    });

});

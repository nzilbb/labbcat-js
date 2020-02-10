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
const fs = require('fs');
const labbcat = require('../nzilbb.labbcat');

// YOU MUST ENSURE THE FOLLOWING SETTINGS ARE VALID FOR YOU TEST LABBCAT SERVER:
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var corpus = null;

describe("#Labbcat", function() { // not an arrow function because we want to this.timeout...
    // waitForTask and getMatches can take a few seconds
    this.timeout(15000);
    
    before((done)=>{
        corpus = new labbcat.Labbcat(baseUrl, username, password);
        corpus.getId((id, errors, messages)=>{
            assert.isNull(
                errors, "\nCould not connect to LaBB-CAT."
                    +"\nThese unit tests require a running LaBB-CAT server to test against."
                    +"\nPlease check the baseUrl variable refers to a running LaBB-CAT server.");
            done();
        });
    });
    
    beforeEach(function(done) {
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        done();
    });
    
    it("inherits methods (getId at least)", (done)=>{
        corpus.getId((result, errors, messages, call)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.equal(result, baseUrl);
            done();
        });
    });

    it("implements getTasks", (done)=>{
        corpus.getTasks((tasks, errors, messages)=>{
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
        corpus.getTasks((tasks, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            if (Object.keys(tasks).length == 0) {
                console.warn("There are no tasks, so can't test getTask.");
                done();
            } else {
                const threadId = Object.keys(tasks)[0];
                corpus.taskStatus(threadId, (task, errors, messages)=>{
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
        corpus.getTasks((tasks, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            if (Object.keys(tasks).length == 0) {
                console.warn("There are no tasks, so can't test getTask.");
                done();
            } else {
                const threadId = Object.keys(tasks)[0];
                corpus.waitForTask(threadId, 1, (task, errors, messages)=>{
                    assert.equal(threadId, task.threadId, "Correct task");
                    assert.containsAllKeys(
                        task, ["threadId", "threadName", "running", "percentComplete", "status"],
                        "Looks like a MediaFile");
                    done();
                });
            }
        });
   });
    
    it("implements newTranscript, updateTranscript, and deleteGraph", (done)=>{
        const transcriptName = "labbcat-js.test.txt";
        const transcriptPath = "test/" + transcriptName;
        
        // ensure the transcript doesn't exist to start with        
        corpus.deleteGraph(transcriptName);
        
        corpus.getCorpusIds((ids, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isAtLeast(ids.length, 1, "There's at least one corpus");
            const corpusId = ids[0];
            corpus.getLayer("transcript_type", (typeLayer, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(typeLayer);
                assert.isNotEmpty(typeLayer.validLabels, "There is at least one transcript type");
                const transcriptType = Object.keys(typeLayer.validLabels)[0];

                assert(fs.existsSync(transcriptPath), "Test transcript exists");
                corpus.newTranscript(
                    transcriptPath, null, null, transcriptType, corpusId, "test",
                    (tasks, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        assert.isNotNull(tasks);
                        assert.include(Object.keys(tasks), transcriptName);
                        const threadId = tasks[transcriptName];
                        
                        corpus.waitForTask(threadId, 30, (task, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors));
                            assert.isFalse(task.running, "Upload task finished in a timely manner");
                            
                            corpus.releaseTask(threadId);
                        
                            // ensure the transcript exists
                            corpus.countMatchingGraphIds(
                                "id = '"+transcriptName+"'", (count, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNumber(count);
                                    assert.equal(count, 1, "Transcript is in the store");
                                    
                                    // re-upload it
                                    corpus.updateTranscript(transcriptPath, (tasks, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors))
                                        assert.isNotNull(tasks);
                                        assert.include(Object.keys(tasks), transcriptName);
                                        const threadId = tasks[transcriptName];
                                        
                                        corpus.waitForTask(threadId, 30, (task, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors));
                                            assert.isFalse(
                                                task.running,
                                                "Upload task finished in a timely manner");
                                            
                                            corpus.releaseTask(threadId);
                        
                                            // ensure the transcript exists
                                            corpus.countMatchingGraphIds(
                                                "id = '"+transcriptName+"'", (count, errors, messages)=>{
                                                    assert.isNull(errors, JSON.stringify(errors))
                                                    assert.isNumber(count);
                                                    assert.equal(
                                                        count, 1,
                                                        "Transcript is still in the store");
                                                    
                                                    // delete it
                                                    corpus.deleteGraph(
                                                        transcriptName, (result, errors, messages)=>{
                                                            assert.isNull(
                                                                errors, JSON.stringify(errors))
                                                            
                                                            // ensure the transcript no longer exists
                                                            corpus.countMatchingParticipantIds(
                                                                "id = '"+transcriptName+"'",
                                                                (count, errors, messages)=>{
                                                                    assert.isNull(
                                                                        errors,
                                                                        JSON.stringify(errors))
                                                                    assert.isNumber(count);
                                                                    assert.equal(
                                                                        count, 0,
                                                                        "Transcript is gone");
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
        });
    });
    

    it("fails with getTask and invalid numeric id", (done)=>{
        corpus.taskStatus(9999, (result, errors, messages)=>{
            assert.isNotNull(errors);
            // console.log(errors[0]);
            done();
        });
    });

    it("fails with getTask and invalid alphabetic id", (done)=>{
        corpus.taskStatus("invalid taskId", (result, errors, messages)=>{
            assert.isNotNull(errors);
            // console.log(errors[0]);
            done();
        });
    });
    
    it("fails with search and invalid pattern", (done)=>{
        corpus.search({}, null, false, (response, errors, messages)=>{
            assert.isNotNull(errors, JSON.stringify(errors))
            done();
        });
    });
    
    it("implements search and cancelTask", (done)=>{
        // start a long-running search - all words
        const pattern = {"columns" : [{
            "layers" : {
                "orthography" : { "pattern" : ".*"}}}]};
        
        corpus.search(pattern, null, false, (response, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isNotNull(response, JSON.stringify(errors))
            assert.isObject(response, JSON.stringify(errors))
            const threadId = response.threadId
            assert.isNotNull(threadId);
            
            corpus.cancelTask(threadId, (result, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))

                setTimeout(()=>{ // wait a second to give it a chance to stop
                    // ensure task is no longer running
                    corpus.taskStatus(threadId, (task, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        assert.isNotNull(task);
                        assert.isFalse(task.running);
                        corpus.releaseTask(threadId);
                        done();
                    });
                }, 1000);
            });
        });
    });
    
    it("implements search, getMatches and getMatchAnnotations", (done)=>{
        // get a participant ID to use
        corpus.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];

            // all instances of "and"
            const pattern = {"columns" : [{
                "layers" : {
                    "orthography" : { "pattern" : "i"}}}]};
            corpus.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const threadId = response.threadId

                corpus.waitForTask(threadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) corpus.cancelTask(threadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    corpus.getMatches(threadId, 2, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isArray(result.matches)
                        assert.isAtLeast(matches.length, 1,
                                         "getMatches: No matches were returned,"
                                         +" cannot test getMatchAnnotations");
                        
                        const layerIds = [ "orthography" ];
                        const matchIds = matches.map(match => match.MatchId);
                        corpus.getMatchAnnotations(
                            matchIds, layerIds, 0, 1, (annotations, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(annotations)
                                assert.isArray(annotations, JSON.stringify(annotations));
                                
                                assert.equal(matchIds.length, annotations.length,
                                             "annotations array is same size as matches array");
                                assert.equal(1, annotations[0].length,
                                             "row arrays are the right size");

                                let annotation = annotations[0][0];
                                assert.containsAllKeys(
                                    annotation, ["id", "label", "startId", "endId"],
                                    "Looks like an annotation");
                                
                                corpus.releaseTask(threadId);
                                done();
                            });
                    });
                });
            });
        });
    });
    
    it("implements abbreviated search patterns", (done)=>{
        // get a participant ID to use
        corpus.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "and"
            const fullPattern = {"columns" : [{
                "layers" : {
                    "orthography" : { "pattern" : "i"}}}]};
            corpus.search(fullPattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const abbreviatedThreadId = response.threadId

                corpus.waitForTask(abbreviatedThreadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) corpus.cancelTask(abbreviatedThreadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    corpus.getMatches(abbreviatedThreadId, 2, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const unabbreviatedMatches = result.matches;
                        assert.isArray(unabbreviatedMatches)

                        // try again with abbreviated syntax...
                        
                        // all instances of "and"
                        const abbreviatedPattern = {"orthography" : "i"};
                        corpus.search(
                            abbreviatedPattern, [ participantId ], false,
                            (response, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(response)
                                assert.isObject(response)
                                const unabbreviatedThreadId = response.threadId
                                
                                corpus.waitForTask(
                                    unabbreviatedThreadId, 30, (task, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors));
                                        
                                        // if the task is still running, it's taking too long, so cancel it
                                        if (task.running) corpus.cancelTask(unabbreviatedThreadId);
                                        assert.isFalse(
                                            task.running,
                                            "Second search finished in a timely manner");
                                        
                                        corpus.getMatches(
                                            unabbreviatedThreadId, 2, (result, errors, messages)=>{
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
                                                corpus.releaseTask(abbreviatedThreadId);
                                                corpus.releaseTask(unabbreviatedThreadId);

                                                done();
                                            });
                                    });
                            });
                    });
                });
            });
        });
    });
    
   // it("implements getSoundFragments", (done)=>{
   //    // get a participant ID to use
   //    String[] ids = corpus.getParticipantIds();
   //    assertTrue("getParticipantIds: Some IDs are returned",
   //               ids.length > 0);
   //    String[] participantId = { ids[0] };      

   //    // all instances of "and"
   //    JSONObject pattern = new PatternBuilder().addMatchLayer("orthography", "and").build();
   //    String threadId = corpus.search(pattern, participantId, false);
   //    try
   //    {
   //       TaskStatus task = corpus.waitForTask(threadId, 30);
   //       // if the task is still running, it's taking too long, so cancel it
   //       if (task.getRunning()) try { corpus.cancelTask(threadId); } catch(Exception exception) {}
   //       assertFalse("Search task finished in a timely manner",
   //                   task.getRunning());
         
   //       Match[] matches = corpus.getMatches(threadId, 2);
   //       if (matches.length == 0)
   //       {
   //          console.log(
   //             "getMatches: No matches were returned, cannot test getSoundFragments");
   //       }
   //       else
   //       {
   //          int upTo = Math.min(5, matches.length);
   //          Match[] subset = Arrays.copyOfRange(matches, 0, upTo);

   //          File[] wavs = corpus.getSoundFragments(subset, null, null);
   //          try {
   //             assertEquals("files array is same size as matches array",
   //                          subset.length, wavs.length);
               
   //             for (int m = 0; m < upTo; m++) {
   //                assertNotNull("Non-null sized file: " + subset[m],
   //                              wavs[m]);
   //                assertTrue("Non-zero sized file: " + subset[m],
   //                           wavs[m].length() > 0);
   //                // console.log(wavs[m].getPath());
   //             }
   //          } finally {
   //             for (File wav : wavs) if (wav != null) wav.delete(); 
   //          }
   //       }
   //    }
   //    finally
   //    {
   //       corpus.releaseTask(threadId);
   //    }
   // }

   // it("implements getFragments", (done)=>{
   //    // get a participant ID to use
   //    String[] ids = corpus.getParticipantIds();
   //    assertTrue("getParticipantIds: Some IDs are returned",
   //               ids.length > 0);
   //    String[] participantId = { ids[0] };      

   //    // all instances of "and"
   //    JSONObject pattern = new PatternBuilder().addMatchLayer("orthography", "and").build();
   //    String threadId = corpus.search(pattern, participantId, false);
   //    try
   //    {
   //       TaskStatus task = corpus.waitForTask(threadId, 30);
   //       // if the task is still running, it's taking too long, so cancel it
   //       if (task.getRunning()) try { corpus.cancelTask(threadId); } catch(Exception exception) {}
   //       assertFalse("Search task finished in a timely manner",
   //                   task.getRunning());
         
   //       Match[] matches = corpus.getMatches(threadId, 2);
   //       if (matches.length == 0)
   //       {
   //          console.log(
   //             "getMatches: No matches were returned, cannot test getFragments");
   //       }
   //       else
   //       {
   //          int upTo = Math.min(5, matches.length);
   //          Match[] subset = Arrays.copyOfRange(matches, 0, upTo);

   //          File dir = new File("getFragments");
   //          String[] layerIds = { "orthography" };
   //          File[] fragments = corpus.getFragments(subset, layerIds, "text/praat-textgrid", dir);
   //          try {
   //             assertEquals("files array is same size as matches array",
   //                          subset.length, fragments.length);
               
   //             for (int m = 0; m < upTo; m++) {
   //                assertNotNull("Non-null sized file: " + subset[m],
   //                              fragments[m]);
   //                assertTrue("Non-zero sized file: " + subset[m],
   //                           fragments[m].length() > 0);
   //                // console.log(fragments[m].getPath());
   //             }
   //          } finally {
   //             for (File fragment : fragments) if (fragment != null) fragment.delete();
   //             dir.delete();
   //          }
   //       }
   //    }
   //    finally
   //    {
   //       corpus.releaseTask(threadId);
   //    }
   // }


});

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
    // waitForTask can take a few seconds
    this.timeout(7000);
    
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

   // @Test(expected = StoreException.class) public void searchInvalidPattern()
   //    String threadId = corpus.search(new JSONObject(), null, false);
   // }

   // it("implements searchAndCancelTask", (done)=>{
   //    // start a long-running search - all words
   //    JSONObject pattern = new JSONObject()
   //       .put("columns", new JSONArray()
   //            .put(new JSONObject()
   //                 .put("layers", new JSONObject()
   //                      .put("orthography", new JSONObject()
   //                           .put("pattern", ".*")))));
   //    String threadId = corpus.search(pattern, null, false);
   //    corpus.cancelTask(threadId);
   // }

   // it("implements searchAndGetMatchesAndGetMatchAnnotations", (done)=>{
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
   //             "getMatches: No matches were returned, cannot test getMatchAnnotations");
   //       }
   //       else
   //       {
   //          int upTo = Math.min(10, matches.length);
   //          // for (int m = 0; m < upTo; m++) console.log("Match: " + matches[m]);

   //          String[] layerIds = { "orthography" };
   //          Annotation[][] annotations = corpus.getMatchAnnotations(matches, layerIds, 0, 1);
   //          assertEquals("annotations array is same size as matches array",
   //                       matches.length, annotations.length);
   //          assertEquals("row arrays are the right size",
   //                       1, annotations[0].length);

   //          layerIds[0] = "invalid layer ID";
   //          try
   //          {
   //             corpus.getMatchAnnotations(matches, layerIds, 0, 1);
   //             fail("getMatchAnnotations with invalid layerId should fail");
   //          }
   //          catch(StoreException exception)
   //          {}
   //       }
   //    }
   //    finally
   //    {
   //       corpus.releaseTask(threadId);
   //    }
   // }

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

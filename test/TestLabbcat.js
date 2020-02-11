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
    this.timeout(45000);
    
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

                                // ensure we can also pass in a list of matches
                                corpus.getMatchAnnotations(
                                    matches, layerIds, 0, 1, (annotations, errors, messages)=>{
                                        assert.isNull(errors,
                                                      "Using matches instead of MatchIds works "
                                                      +JSON.stringify(errors))
                                        assert.isNotNull(annotations)
                                        assert.isArray(annotations, JSON.stringify(annotations));
                                        
                                        assert.equal(
                                            matchIds.length, annotations.length,
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
                const unabbreviatedThreadId = response.threadId

                corpus.waitForTask(unabbreviatedThreadId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) corpus.cancelTask(unabbreviatedThreadId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    corpus.getMatches(unabbreviatedThreadId, 2, (result, errors, messages)=>{
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
                                const abbreviatedThreadId = response.threadId
                                
                                corpus.waitForTask(
                                    abbreviatedThreadId, 30, (task, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors));
                                        
                                        // if the task is still running, it's taking too long, so cancel it
                                        if (task.running) corpus.cancelTask(abbreviatedThreadId);
                                        assert.isFalse(
                                            task.running,
                                            "Second search finished in a timely manner");
                                        
                                        corpus.getMatches(
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
                                                corpus.releaseTask(unabbreviatedThreadId); 
                                                corpus.releaseTask(abbreviatedThreadId);
                                               
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
        corpus.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "I"
            const pattern = {"orthography" : "i"};
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
                    
                    corpus.getMatches(threadId, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");
                        
                        corpus.releaseTask(threadId);
                        
                        const upTo = Math.min(5, matches.length);
                        const subset = matches.slice(0, upTo);
                        // convert MatchIds to arrays of individual Ids
                        const graphIds = subset.map(match => match.Transcript);
                        const startOffsets = subset.map(match => match.Line);
                        const endOffsets = subset.map(match => match.LineEnd);

                        // getSoundFragments with all parameters
                        corpus.getSoundFragments(
                            graphIds, startOffsets, endOffsets, 16000, "test",
                            (wavs, errors, messages)=>{
                                assert.isNull(errors, "getSoundFragments all params: "
                                              +JSON.stringify(errors))
                                assert.equal(subset.length, wavs.length,
                                             "files array is same size as matches array");
                                
                                for (let m = 0; m < upTo; m++) {
                                    // console.log(wavs[m]);
                                    assert.isNotNull(wavs[m],
                                                     "Non-null file: " + subset[m]);
                                    assert.isTrue(fs.existsSync(wavs[m]),
                                                  "File exists: " + subset[m]);
                                    assert.isAbove(fs.statSync(wavs[m]).size, 0,
                                                   "Non-zero sized file: " + subset[m]);
                                    
                                    // be tidy
                                    fs.unlinkSync(wavs[m]);
                                }

                                // getSoundFragments without dir
                                corpus.getSoundFragments(
                                    graphIds, startOffsets, endOffsets, 16000,
                                    (wavs, errors, messages)=>{
                                        assert.isNull(errors, "getSoundFragments without dir: "
                                                      +JSON.stringify(errors))
                                        assert.equal(subset.length, wavs.length,
                                                     "files array is same size as matches array");
                                        
                                        for (let m = 0; m < upTo; m++) {
                                            // console.log(wavs[m]);
                                            assert.isNotNull(wavs[m],
                                                             "Non-null file: " + subset[m]);
                                            assert.isTrue(fs.existsSync(wavs[m]),
                                                          "File exists: " + subset[m]);
                                            assert.isAbove(fs.statSync(wavs[m]).size, 0,
                                                   "Non-zero sized file: " + subset[m]);
                                            
                                            // be tidy
                                            fs.unlinkSync(wavs[m]);
                                        }
                                        
                                        // getSoundFragments without sampleRate
                                        corpus.getSoundFragments(
                                            graphIds, startOffsets, endOffsets,
                                            (wavs, errors, messages)=>{
                                                assert.isNull(
                                                    errors, "getSoundFragments no sampleRate: "
                                                        +JSON.stringify(errors))
                                                assert.equal(
                                                    subset.length, wavs.length,
                                                    "files array is same size as matches array");
                                                
                                                for (let m = 0; m < upTo; m++) {
                                                    // console.log(wavs[m]);
                                                    assert.isNotNull(
                                                        wavs[m],
                                                        "Non-null file: " + subset[m]);
                                                    assert.isTrue(fs.existsSync(wavs[m]),
                                                                  "File exists: " + subset[m]);
                                                    assert.isAbove(
                                                        fs.statSync(wavs[m]).size, 0,
                                                        "Non-zero sized file: " + subset[m]);
                                                    
                                                    // be tidy
                                                    fs.unlinkSync(wavs[m]);
                                                }
                                                
                                                // getSoundFragments with matches instead of
                                                // graphIds, startOffsets, and endOffsets
                                                corpus.getSoundFragments(
                                                    subset, (wavs, errors, messages)=>{
                                                        assert.isNull(
                                                            errors, "getSoundFragments w matches: "
                                                                +JSON.stringify(errors))
                                                        assert.equal(
                                                            subset.length, wavs.length,
                                                            "files array is same size as matches");
                                                        
                                                        for (let m = 0; m < upTo; m++) {
                                                            // console.log(wavs[m]);
                                                            assert.isNotNull(
                                                                wavs[m],
                                                                "Non-null file: " + subset[m]);
                                                            assert.isTrue(
                                                                fs.existsSync(wavs[m]),
                                                                "File exists: " + subset[m]);
                                                            assert.isAbove(
                                                                fs.statSync(wavs[m]).size, 0,
                                                                "Non-zero sized file: "+subset[m]);
                                                            
                                                            // be tidy
                                                            fs.unlinkSync(wavs[m]);
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
        corpus.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all instances of "I"
            const pattern = {"orthography" : "i"};
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
                    
                    corpus.getMatches(threadId, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");
                        
                        corpus.releaseTask(threadId);
                        
                        const upTo = Math.min(5, matches.length);
                        const subset = matches.slice(0, upTo);
                        // convert MatchIds to arrays of individual Ids
                        const graphIds = subset.map(match => match.Transcript);
                        const startOffsets = subset.map(match => match.Line);
                        const endOffsets = subset.map(match => match.LineEnd);

                        const layerIds = [ "orthography" ];
                        // getFragments with dir
                        corpus.getFragments(
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
                                    
                                    // be tidy
                                    fs.unlinkSync(textgrids[m]);
                                }
                                
                                // getFragments without dir
                                corpus.getFragments(
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
                                            
                                            // be tidy
                                            fs.unlinkSync(textgrids[m]);
                                        }

                                        // getFragments with matches instead of
                                        // graphIds, startOffsets, and endOffsets
                                        corpus.getFragments(
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
                                                    
                                                    // be tidy
                                                    fs.unlinkSync(textgrids[m]);
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

    it("works with the example code", (done)=>{
        
        // get the first participant in the corpus
        corpus.getParticipantIds((ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some participant IDs exist");
            const participantId = ids[0];
            
            // all their instances of "the" followed by a word starting with a vowel
            const pattern = [
                {"orthography" : "i"},
                {"phonemes" : "[cCEFHiIPqQuUV0123456789~#\\$@].*"}];

            // start searching
            corpus.search(pattern, [ participantId ], false, (response, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(response)
                assert.isObject(response)
                const taskId = response.threadId
                
                // wait for the search to finish
                corpus.waitForTask(taskId, 30, (task, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    
                    // if the task is still running, it's taking too long, so cancel it
                    if (task.running) corpus.cancelTask(taskId);
                    assert.isFalse(task.running, "Search finished in a timely manner");

                    // get the matches
                    corpus.getMatches(taskId, (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(result)
                        assert.isNotNull(result.name)
                        const matches = result.matches;
                        assert.isAtLeast(
                            matches.length, 0,
                            "No matches were returned, cannot test getSoundFragments");

                        console.log("There were " + matches.length + " matches for " + participantId);
                        
                        corpus.releaseTask(taskId);

                        // get TextGrids of the utterances
                        corpus.getFragments(
                            matches, [ "orthography", "phonemes" ], "text/praat-textgrid",
                            (textgrids, errors, messages)=>{
                                assert.isNull(errors, "getFragments with dir: "
                                              +JSON.stringify(errors))
                                assert.equal(matches.length, textgrids.length,
                                             "files array is same size as matches array");
                                
                                for (let textgrid of textgrids) {
                                    console.log(textgrid);
                                    // be tidy
                                    fs.unlinkSync(textgrid);
                                }
                                
                                // get the utterance recordings
                                corpus.getSoundFragments(
                                    matches, (wavs, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors))
                                        assert.equal(
                                            matches.length, wavs.length,
                                            "files array is same size as matches");
                                        
                                        for (let wav of wavs) {
                                            console.log(wav);
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
    
});



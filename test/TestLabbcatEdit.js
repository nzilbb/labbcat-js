'use strict';

/**
 * Unit tests for LabbcatEditQuery.
 * <p>These tests test the functionality of the client library, not the server. 
 * <p>They assume the existence of a valid LaBB-CAT instance (configured by
 * <var>labbcatUrl</var>) which responds correctly to requests, but do not generally test
 * that the server behaves correctly , nor assume specific corpus content. For the tests
 * to work, the first transcript listed in LaBB-CAT must have some words and some media, and
 * the first participant listed must have some transcripts. 
 */

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');

// YOU MUST ENSURE THE FOLLOWING SETTINGS ARE VALID FOR YOU TEST LABBCAT SERVER:
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var store = null;

describe("#LabbcatEdit", function() {
    // waitForTask and getMatches can take a few seconds
    this.timeout(45000);

    before((done)=>{
        store = new labbcat.LabbcatEdit(baseUrl, username, password);
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

    it("inherits methods (getId at least)", (done)=>{
        assert.equal(baseUrl + "api/store/", store.storeUrl);
        assert.equal(baseUrl + "api/edit/store/", store.storeEditUrl);
        store.getId((result, errors, messages, call)=>{
            assert.isNull(errors);
            assert.equal(baseUrl, result);
            done();
        });
    });
    
    it("implements deleteTranscript", (done)=>{
        store.deleteTranscript("nonexistent transcript ID", (result, errors, messages) =>{
            assert.isNotNull(errors, "deleteTranscript should fail for nonexistant transcript ID");
            assert.include(errors[0], "not found");
            done();
        });
    });

    it("implements newTranscript, updateTranscript, and deleteTranscript", (done)=>{
        const transcriptName = "labbcat-js.test.txt";
        const transcriptPath = "test/" + transcriptName;
        
        // ensure the transcript doesn't exist to start with        
        store.deleteTranscript(transcriptName);
        
        store.getCorpusIds((ids, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isAtLeast(ids.length, 1, "There's at least one corpus");
            const corpusId = ids[0];
            store.getLayer("transcript_type", (typeLayer, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(typeLayer);
                assert.isNotEmpty(typeLayer.validLabels, "There is at least one transcript type");
                const transcriptType = Object.keys(typeLayer.validLabels)[0];

                assert(fs.existsSync(transcriptPath), "Test transcript exists");
                store.newTranscript(
                    transcriptPath, null, null, transcriptType, corpusId, "test",
                    (threadId, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        assert.isNotNull(threadId);
                        
                        store.waitForTask(threadId, 30, (task, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors));
                            assert.isFalse(task.running, "Upload task finished in a timely manner");
                            
                            store.releaseTask(threadId);
                            
                            // ensure the transcript exists
                            store.countMatchingTranscriptIds(
                                "id = '"+transcriptName+"'", (count, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNumber(count);
                                    assert.equal(count, 1, "Transcript is in the store");
                                    
                                    // re-upload it
                                    store.updateTranscript(transcriptPath, (threadId, errors, messages)=>{
                                        assert.isNull(errors, JSON.stringify(errors))
                                        assert.isNotNull(threadId);
                                        
                                        store.waitForTask(threadId, 30, (task, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors));
                                            assert.isFalse(
                                                task.running,
                                                "Upload task finished in a timely manner");
                                            
                                            store.releaseTask(threadId);
                                            
                                            // ensure the transcript exists
                                            store.countMatchingTranscriptIds(
                                                "id = '"+transcriptName+"'", (count, errors, messages)=>{
                                                    assert.isNull(errors, JSON.stringify(errors))
                                                    assert.isNumber(count);
                                                    assert.equal(
                                                        count, 1,
                                                        "Transcript is still in the store");
                                                    
                                                    // delete it
                                                    store.deleteTranscript(
                                                        transcriptName, (result, errors, messages)=>{
                                                            assert.isNull(
                                                                errors, JSON.stringify(errors))
                                                            
                                                            // ensure the transcript no longer exists
                                                            store.countMatchingParticipantIds(
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
    
});

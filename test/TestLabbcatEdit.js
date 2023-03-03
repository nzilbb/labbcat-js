'use strict';

/**
 * Unit tests for LabbcatEdit.
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

    it("implements getParticipant, saveParticipant, and deleteTranscript", (done)=>{
        const originalId = "TestLabbcatEdit-participant";
        const changedId = "TestLabbcatEdit-participant-changed";
        // create participant
        store.saveParticipant(
            originalId, originalId, {"participant_gender":"X"}, (result, errors, messages) =>{
                assert.isNull(errors);
                
                // check it's there
                store.getParticipant(
                    originalId, ["participant_gender"], (participant, errors, messages)=>{
                        assert.isNull(errors);
                        assert.equal(
                            participant.label, originalId, "Correct participant"); // not getId()
                        assert.isNotNull(participant.annotations,
                                         "Has child annotations " + JSON.stringify(participant));
                        assert.isNotNull(participant.annotations.participant_gender,
                                         "Includes attribute " + JSON.stringify(participant));
                        assert.equal(participant.annotations.participant_gender[0].label, "X",
                                     "Attribute correct " + JSON.stringify(participant));
                        
                        // update participant
                        store.saveParticipant(
                            originalId, changedId, {"participant_gender":"Y"},
                            (result, errors, messages) =>{
                                assert.isNull(errors);
                                
                                // check it's changed
                                store.getParticipant(
                                    changedId, ["participant_gender"],
                                    (participant, errors, messages)=>{
                                        assert.isNull(errors);
                                        assert.equal(
                                            participant.label, changedId, "Correct participant");
                                        assert.equal(
                                            participant.annotations["participant_gender"][0].label,
                                            "Y", "Attribute changed");
                                        
                                        // delete participant
                                        store.deleteParticipant(
                                            changedId, (result, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors));
                                                
                                                // check it's gone
                                                store.getParticipant(
                                                    changedId, ["participant_gender"],
                                                    (participant, errors, messages)=>{
                                                        assert.isNull(errors);
                                                        assert.isNull(participant,
                                                                      "Participant not returned");
                                                        
                                                        done();
                                                    });
                                            });
                                    });
                            });
                    });
            });
    });
    
    it("implements newTranscript, updateTranscript, deleteTranscript, and deleteParticipant", (done)=>{
     const participantName = "UnitTester";
     const transcriptName = "labbcat-js.test.txt";
     const transcriptPath = "test/" + transcriptName;
     
     // ensure the transcript/participant dosn't exist to start with    
     store.deleteTranscript(transcriptName, (nothing, errors, messages)=>{
       store.deleteParticipant(participantName, (nothing, errors, messages)=>{
         
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
               (result, errors, messages)=>{
                 assert.isNull(errors, JSON.stringify(errors));
                 const threadId = result[Object.keys(result)[0]]
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
                       
                       // ensure participant exists
                       store.countMatchingParticipantIds(
                         "id = '"+participantName+"'", (count, errors, messages)=>{
                           assert.isNull(errors, JSON.stringify(errors))
                           assert.isNumber(count);
                           assert.equal(count, 1, "Participant is in the store");
                           
                           // re-upload it
                           store.updateTranscript(
                             transcriptPath, (result, errors, messages)=>{
                               assert.isNull(errors, JSON.stringify(errors))
                               const threadId = result[Object.keys(result)[0]]
                               assert.isNotNull(threadId);
                               
                               store.waitForTask(
                                 threadId, 30, (task, errors, messages)=>{
                                   assert.isNull(errors, JSON.stringify(errors));
                                   assert.isFalse(
                                     task.running, "Upload task finished in a timely manner");
                                   
                                   store.releaseTask(threadId);
                                   
                                   // ensure the transcript exists
                                   store.countMatchingTranscriptIds(
                                     "id = '"+transcriptName+"'", (count, errors, messages)=>{
                                       assert.isNull(errors, JSON.stringify(errors))
                                       assert.isNumber(count);
                                       assert.equal(count, 1, "Transcript is still in the store");
                                       
                                       // delete it
                                       store.deleteTranscript(
                                         transcriptName, (result, errors, messages)=>{
                                           assert.isNull(errors, JSON.stringify(errors))
                                           
                                           // ensure the transcript no longer exists
                                           store.countMatchingTranscriptIds(
                                             "id = '"+transcriptName+"'",
                                             (count, errors, messages)=>{
                                               assert.isNull(errors, JSON.stringify(errors))
                                               assert.isNumber(count);
                                               assert.equal(count, 0, "Transcript is gone");
                                               // delete participant
                                               store.deleteParticipant(
                                                 participantName, (result, errors, messages)=>{
                                                   assert.isNull(errors, JSON.stringify(errors))
                                                   
                                                   // ensure the participant no longer exists
                                                   store.countMatchingParticipantIds(
                                                     "id = '"+transcriptName+"'",
                                                     (count, errors, messages)=>{
                                                       assert.isNull(
                                                         errors, JSON.stringify(errors))
                                                       assert.isNumber(count);
                                                       assert.equal(
                                                         count, 0, "Transcript is gone");
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
         });
       });
     });    
    });
 
    it("supports optional newTranscript arguments", (done)=>{
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
                // upload without mediaSuffix
                store.newTranscript(
                    transcriptPath, null, transcriptType, corpusId, "test",
                    (result, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        const threadId = result[Object.keys(result)[0]]
                        assert.isNotNull(threadId);
                        
                        store.waitForTask(threadId, 30, (task, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors));
                            assert.isFalse(task.running, "Upload task finished in a timely manner");
                            
                            store.releaseTask(threadId);
                            
                            // ensure the transcript exists
                            store.countMatchingTranscriptIds(
                                "id == '"+transcriptName+"'", (count, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNumber(count);
                                    assert.equal(count, 1, "Transcript is in the store");
                                    
                                    // delete it
                                    store.deleteTranscript(
                                        transcriptName, (result, errors, messages)=>{
                                            assert.isNull(
                                                errors, JSON.stringify(errors))
                                            // upload without mediaSuffix and episode
                                            store.newTranscript(
                                                transcriptPath, null, transcriptType, corpusId, "test",
                                                (result, errors, messages)=>{
                                                    assert.isNull(errors, JSON.stringify(errors));
                                                    const threadId = result[Object.keys(result)[0]]
                                                    assert.isNotNull(threadId);
                                                    
                                                    store.waitForTask(threadId, 30, (task, errors, messages)=>{
                                                        assert.isNull(errors, JSON.stringify(errors));
                                                        assert.isFalse(task.running, "Upload task finished in a timely manner");
                                                        
                                                        store.releaseTask(threadId);
                                                        
                                                        // ensure the transcript exists
                                                        store.countMatchingTranscriptIds(
                                                            "id == '"+transcriptName+"'", (count, errors, messages)=>{
                                                                assert.isNull(errors, JSON.stringify(errors))
                                                                assert.isNumber(count);
                                                                assert.equal(count, 1, "Transcript is in the store");
                                                                
                                                                // delete it
                                                                store.deleteTranscript(
                                                                    transcriptName, (result, errors, messages)=>{
                                                                        assert.isNull(
                                                                            errors, JSON.stringify(errors))
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
    
    it("implements saveTranscript", (done)=>{
        store.getMatchingTranscriptIds("/AP511.+\\.eaf/.test(id)'", 1, 0, (ids, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotEmpty(ids, "Some transcript IDs are returned - maybe check the test regex?");
            let graphId = ids[0];
            store.getTranscript(graphId, ["transcript_language"], (graph, errors, messages)=>{
                // get transcript_language
                assert.isNull(errors);
                assert.isNotNull(graph);
                assert.isNotNull(graph.transcript_language);
                assert.isTrue(graph.transcript_language.length > 0);
                const originalLabel = graph.transcript_language[0].label;

                // change label
                graph.transcript_language[0].label = "TestLabbcatEdit.js";
                store.saveTranscript(graph, (saved, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isTrue(saved);

                    // check label is really changed
                    store.getTranscript(graphId, ["transcript_language"], (graph, errors, messages)=>{
                        assert.isNull(errors);
                        assert.equal("TestLabbcatEdit.js", graph.transcript_language[0].label);

                        // put back the original value
                        graph.transcript_language[0].label = originalLabel;
                        store.saveTranscript(graph, (saved, errors, messages)=>{
                            assert.isNull(errors);
                            assert.isTrue(saved);                   
                            done();
                        });
                    });
                });
            });
        });
    });

});

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
  
  it("implements transcriptUpload and transcriptUploadParameters", (done)=>{
    const participantName = "UnitTester";
    const transcriptName = "labbcat-js.test.txt";
    const transcriptPath = "test/" + transcriptName;
    const mediaPath = "test/labbcat-js.test.wav";
    const docPath = "test/labbcat-js.test.doc";
    
    // ensure the transcript/participant dosn't exist to start with    
    store.deleteTranscript(transcriptName, (nothing, errors, messages)=>{
      store.deleteParticipant(participantName, (nothing, errors, messages)=>{

        store.transcriptUpload(
          transcriptPath, mediaPath, false, // merge=false : new transcript
          (result, errors, messages)=>{
            assert.isNull(errors, "No errors on transcriptUpload: "+JSON.stringify(errors));
            assert.exists(result.id, "Upload ID returned");
            assert.exists(result.parameters, "Upload parameters returned");
            // set parameters with their default values
            var parameters = {};
            for (var parameter of result.parameters) {
              parameters[parameter.name] = parameters[parameter.value];
            }
            store.transcriptUploadParameters(
              result.id, parameters,
              (result, errors, messages)=>{
                assert.isNull(errors, "No errors on transcriptUpload: "+JSON.stringify(errors));
                assert.isNotNull(result, "redult returned");
                assert.isNotNull(result.transcripts, "Result includes task info");            
                assert.isNotNull(result.transcripts[transcriptName], "Transcript thread included");
                var threadId = result.transcripts[transcriptName];
                store.cancelTask(threadId, (task, errors, messages)=>{
                  assert.isNull(errors, JSON.stringify(errors));
                  store.releaseTask(threadId);
                  
                  // ensure the transcript exists
                  store.countMatchingTranscriptIds(
                    "id = '"+transcriptName+"'", (count, errors, messages)=>{
                      assert.isNull(errors, JSON.stringify(errors))
                      assert.isNumber(count);
                      assert.equal(count, 1, "Transcript is in the store");
                      
                      // delete it
                      store.deleteTranscript(
                        transcriptName, (result, errors, messages)=>{
                          assert.isNull(errors, JSON.stringify(errors))
                          done();
                        });
                    });
                });
              });
          });
      });
    });
  });
  
  it("implements newTranscript, updateTranscript, saveMedia, deleteTranscript, and deleteParticipant", (done)=>{
    const participantName = "UnitTester";
    const transcriptName = "labbcat-js.test.txt";
    const transcriptPath = "test/" + transcriptName;
    const mediaPath = "test/labbcat-js.test.wav";
    const docPath = "test/labbcat-js.test.doc";
    
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

                          // upload media
                          store.saveMedia(transcriptName, mediaPath, (mediaFile, errors, messages) => {
                            assert.isNull(errors, JSON.stringify(errors));
                            assert.isNotNull(mediaFile, "Media file returned by saveMedia");
                            assert.isNotNull(mediaFile.name,
                                             "Media file name returned by saveMedia: "
                                             + JSON.stringify(mediaFile));
                            
                            // upload document
                            store.saveEpisodeDocument(transcriptName, docPath, (docFile, errors, messages) => {
                              assert.isNull(errors, JSON.stringify(errors));
                              assert.isNotNull(
                                mediaFile, "Document file returned by saveEpisodeDocument");
                              assert.isNotNull(docFile.name,
                                               "Document file name returned by saveEpisodeDocument: "
                                               + JSON.stringify(docFile));
                              
                              // delete document
                              store.deleteMedia(transcriptName, docFile.name, (x, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors));
                                
                                // re-upload trancript
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

  it("implements uploadParticipantAttributes", (done)=>{
    const participantId = "UnitTester";
    const csvName = "participants.csv";
    const csvPath = "test/" + csvName;
    const idColumn = 0;
    const columnLayer = [ null, "participant_gender", "", "participant_notes" ];
    store.uploadParticipantAttributes(
      csvPath, idColumn, columnLayer, (counts, errors, messages)=>{
        assert.isNull(errors);
        assert.isNotEmpty(counts, "Some counts are returned");
        assert.equal(0, counts.updated, "No participant updated");
        assert.equal(1, counts.created, "One participant created");
        store.getParticipant(
          participantId, ["participant_gender", "participant_notes"],
          (participant, errors, messages)=>{
            assert.isNull(errors);
            assert.equal(
              participant.label, participantId, "Correct participant");
            assert.equal(
              participant.annotations["participant_gender"][0].label,
              "X", "Gender correct");
            assert.equal(
              participant.annotations["participant_notes"][0].label,
              "UnitTester notes", "Notes correct");
            store.deleteParticipant(
              participantId, (result, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors));            
                done();
              });
          });
      });
  });

  it("implements uploadTranscriptAttributes", (done)=>{
    const participantName = "UnitTester";
    const transcriptName = "labbcat-js.test.txt";
    const transcriptPath = "test/" + transcriptName;
    const csvName = "transcripts.csv";
    const csvPath = "test/" + csvName;
    const idColumn = 0;
    const columnLayer = [ null, "", "transcript_version", "transcript_versionDate" ];
    
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

                // now update transcript attributes
                store.uploadTranscriptAttributes(
                  csvPath, idColumn, columnLayer, (counts, errors, messages)=>{
                    assert.isNull(errors);
                    assert.isNotEmpty(counts, "Some counts are returned");
                    assert.equal(1, counts.updated, "One transcript updated");
                    assert.equal(1, counts.missing, "One transcript missing");
                    store.getTranscript(
                      transcriptName, ["transcript_version", "transcript_versionDate"],
                      (graph, errors, messages)=>{
                        assert.isNull(errors);
                        assert.isTrue(graph.transcript_version.length > 0);
                        assert.equal(
                          graph.transcript_version[0].label,
                          "CSV", "Version correct");
                        assert.isTrue(graph.transcript_versionDate.length > 0);
                        assert.equal(
                          graph.transcript_versionDate[0].label,
                          "2026-08-13", "Version correct");
                        store.deleteTranscript(
                          transcriptName, (result, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors));            
                            store.deleteParticipant(
                              participantName, (nothing, errors, messages)=>{
                                done();
                              }); // deleteParticipant
                          }); // deleteTranscript
                      }); // getTranscript
                  }); // uploadTranscriptAttributes
              }); // newTranscript
          }); // getLayer
        }); /// getCorpusIds
      }); // deleteParticipant
    }); // deleteTranscript
  });
});

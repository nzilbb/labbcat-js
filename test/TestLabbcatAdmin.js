'use strict';

/**
 * Unit tests for LabbcatAdmin.
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

describe("#LabbcatAdmin", function() {
    // waitForTask and getMatches can take a few seconds
    this.timeout(45000);

    before((done)=>{
        store = new labbcat.LabbcatAdmin(baseUrl, username, password);
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
        assert.equal(baseUrl + "api/admin/store/", store.storeAdminUrl);
        store.getId((result, errors, messages, call)=>{
            assert.isNull(errors);
            assert.equal(baseUrl, result);
            done();
        });
    });

    it("implements corpora CRUD operations", (done)=>{

        const corpus_name = "unit-test";
        const corpus_language = "en";
        const corpus_description = "Temporary corpus for unit testing";
        
        // ensure the transcript doesn't exist to start with
        store.deleteCorpus(corpus_name, (result, errors, messages)=>{

            // create the corpus
            store.createCorpus(
                corpus_name, corpus_language, corpus_description, (corpus, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(corpus);
                    assert.equal(corpus.corpus_name, corpus_name,
                                 "corpus_name saved");
                    assert.equal(corpus.corpus_language, corpus_language,
                                 "corpus_language saved");
                    assert.equal(corpus.corpus_description, corpus_description,
                                 "corpus_description saved");
                    
                    // ensure the corpus exists
                    store.readCorpora((corpora, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(corpora, "The corpora are returned")
                        assert.isAtLeast(corpora.length, 1, "There is at least one corpus");
                        
                        const matchedCorpora = corpora.filter(c => {
                            return c.corpus_name == corpus_name;});
                        assert.equal(matchedCorpora.length, 1,
                                     "The new corpus is present: " + JSON.stringify(corpora));
                        assert.equal(matchedCorpora[0].corpus_name, corpus_name,
                                     "corpus_name present");
                        assert.equal(matchedCorpora[0].corpus_language, corpus_language,
                                     "corpus_language correct");
                        assert.equal(matchedCorpora[0].corpus_description, corpus_description,
                                     "corpus_description correct");
                        
                        // update it
                        const new_corpus_language = "es";
                        const new_corpus_description = "Temporary Spanish corpus for unit testing";
                        store.updateCorpus(
                            corpus_name, new_corpus_language, new_corpus_description,
                            (updatedCorpus, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedCorpus);
                                assert.equal(updatedCorpus.corpus_name, corpus_name,
                                             "corpus_name unchanged");
                                assert.equal(updatedCorpus.corpus_language, new_corpus_language,
                                             "corpus_language changed");
                                assert.equal(updatedCorpus.corpus_description, new_corpus_description,
                                             "corpus_description changed");
                                
                                
                                // ensure the corpus updated
                                store.readCorpora((corpora, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(corpora, "The corpora are returned")
                                    assert.isAtLeast(corpora.length, 1, "There is at least one corpus");
                                    
                                    const newMatchedCorpora = corpora.filter(c => {
                                        return c.corpus_name == corpus_name;});
                                    assert.equal(
                                        newMatchedCorpora.length, 1,
                                        "The updated corpus is present");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_name, corpus_name,
                                        "updated corpus_name correct");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_language, new_corpus_language,
                                        "updated corpus_language correct");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_description,
                                        new_corpus_description,
                                        "updated corpus_description correct");
                                    
                                    // delete it
                                    store.deleteCorpus(
                                        corpus_name, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readCorpora((corpora, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(corpora, "The corpora are returned")
                                                
                                                const finalMatchedCorpora = corpora.filter(c => {
                                                    return c.corpus_name == corpus_name;});
                                                assert.equal(finalMatchedCorpora.length, 0,
                                                             "The new corpus is gone");
                                                
                                                // can't delete it again
                                                store.deleteCorpus(
                                                    corpus_name, (result, errors, messages) =>{
                                                        assert.isNotNull(
                                                            errors,
                                                            "deleteCorpus fails for nonexistant corpus ID");
                                                        assert.include(errors[0], "doesn't exist");
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

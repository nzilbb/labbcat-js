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

describe("#GraphStore", ()=>{
    before((done)=>{
        store = new labbcat.GraphStore(baseUrl, username, password);
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
        store.getId((result, errors, messages, call)=>{
            assert.isNull(errors);
            assert.equal(baseUrl, result);
            done();
        });
    });
    
    it("implements deleteGraph", (done)=>{
        store.deleteGraph("nonexistent graph ID", (result, errors, messages) =>{
            assert.isNotNull(errors, "deleteGraph should fail for nonexistant graph ID");
            assert.include(errors[0], "Graph not found");
            done();
        });
    });
});

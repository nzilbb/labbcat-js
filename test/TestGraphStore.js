'use strict';

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var store = null;

describe("#GraphStore", ()=>{
    before((done)=>{
        store = new labbcat.GraphStore(baseUrl, username, password);
        store.getId((id, errors, messages)=>{
            assert.isNull(errors, "\nCould not connect to LaBB-CAT."
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

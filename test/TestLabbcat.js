'use strict';

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var lc = null;

describe("#Labbcat", ()=>{
    before((done)=>{
        lc = new labbcat.Labbcat(baseUrl, username, password);
        lc.getId((id, errors, messages)=>{
            assert.isNull(errors, "\nCould not connect to LaBB-CAT."
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
        lc.getId((result, errors, messages, call)=>{
            assert.isNull(errors);
            assert.equal(result, baseUrl);
            done();
        });
    });
});

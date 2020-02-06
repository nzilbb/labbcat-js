'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "http://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#GraphStoreQuery", function() {
    beforeEach((done)=>{
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        done();
    });
    
    it("exports GraphStoreQuery", ()=>{
        expect(labbcat.GraphStoreQuery).to.exist;
    });
    
    it("support getId", (done)=>{
        const store = new labbcat.GraphStoreQuery(baseUrl, username, password);
        store.getId((result, errors, messages, call)=>{
            console.log("in result " + result);
            expect(result).to.equal(baseUrl);
            done();
        });
    });
});

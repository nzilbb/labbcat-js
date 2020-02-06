'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "http://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#GraphStore", ()=>{
    beforeEach((done)=>{
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        done();
    });

    it("exports GraphStore", ()=>{
        expect(labbcat.GraphStore).to.exist;
    });
});

'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "http://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#GraphStore", function() {
    beforeEach(function(done) {
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        done();
    });

    it("exports GraphStore", function() {
        expect(labbcat.GraphStore).to.exist;
    });
});

'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "http://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#Labbcat", function() {
    it("exports Labbcat", function() {
        expect(labbcat.Labbcat).to.exist;
    });

    it("support getId", function(done) {
        const lc = new labbcat.Labbcat(baseUrl, username, password);
        lc.getId(function(result, errors, messages) {
            expect(result).to.equal(baseUrl);
            done();
        });
    });
});

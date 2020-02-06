'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "https://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#GraphStore", function() {
    it("exports GraphStore", function() {
        expect(labbcat.GraphStore).to.exist;
    });
});

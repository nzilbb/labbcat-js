'use strict';

var expect = require('chai').expect;
var labbcat = require('../nzilbb.labbcat');
var baseUrl = "https://localhost:8080/labbcat/";
var username = "labbcat";
var password = "labbcat";

describe("#GraphStoreQuery", function() {
    it("exports GraphStoreQuery", function() {
        expect(labbcat.GraphStoreQuery).to.exist;
    });
});

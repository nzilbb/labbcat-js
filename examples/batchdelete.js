#!/usr/bin/env nodejs

// This This script deletes all transcripts in a selected corpus.
// Usage:
// batchdelete.js <corpus>

var labbcatUrl = "http://localhost:8080/labbcat";
var userName = "labbcat";
var password = "labbcat";

if (!process.argv[2]) {
    console.log("This script deletes all transcripts in a selected corpus.");
    console.log("Please specify a corpus to delete from.");
    console.log("Usage:");
    console.log(process.argv[1] + " <corpus>");
} else {
    var fs = require("fs");
    var path = require('path');
    var labbcat = require("@nzilbb/labbcat");
    
    var local = new labbcat.LabbcatEdit(labbcatUrl, userName, password);
    
    function deleteNextTranscript() {
        if (transcriptFiles.length > 0) {
	    deleteTranscript(transcriptFiles.shift());
        } else {
	    console.log("Finished.");
        }
    }
    
    function deleteTranscript(transcript) {
        console.log(transcript);
        local.deleteTranscript(
	    path.basename(transcript),
	    function(result, errors, messages, call, id) {
	        for (var e in errors) console.log("ERROR " + errors[e]);
	        deleteNextTranscript();
	    });
    }
    
    var transcriptFiles = [];
    
    console.log("Deleting all transcripts in "+process.argv[2] +"...");
    local.getTranscriptIdsInCorpus(
        process.argv[2],
	function(result, errors, messages, call) {
	    for (var e in errors) console.log("ERROR " + errors[e]);
	    
	    transcriptFiles = result;
	    deleteNextTranscript();
	});    
}

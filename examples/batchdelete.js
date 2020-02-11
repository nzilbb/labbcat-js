#!/usr/bin/env nodejs

// file extension to look for
var ext = "trs";

var labbcatUrl = "http://localhost/labbcat";
var userName = "script";
var password = "bxdWInkyObFYGLEMUhH1";

console.log("Batch delete...");

var fs = require("fs");
var labbcat = require("@nzilbb/labbcat");

var local = new labbcat.Labbcat(labbcatUrl, userName, password);

function recursivelyFindTextFiles(pathPrefix, directory) {
    var dirPath = (pathPrefix?pathPrefix+"/":"")+directory;
    var files = fs.readdirSync(dirPath);
    for (f in files) {
	var path = dirPath + "/" + files[f];
	var file = fs.statSync(path)
	if (file.isFile()) {
	    if (new RegExp("\\."+ext+"$").test(files[f])) {
		console.log("Found " + path);
		transcriptFiles.push(path);
	    }
	} else if (file.isDirectory()) {
	    recursivelyFindTextFiles(dirPath, files[f])
	}
    }
}

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
	transcript.replace(/.*\//g,""),
	function(result, errors, messages, call, id) {
	    for (var e in errors) console.log("ERROR " + errors[e]);
	    deleteNextTranscript();
	});
}

var transcriptFiles = [];

if (process.argv[2]) {
    console.log("Deleting transcripts in "+process.argv[2] +"...");
    local.getGraphIdsInCorpus(process.argv[2],
	function(result, errors, messages, call) {
	    for (var e in errors) console.log("ERROR " + errors[e]);
		
	    transcriptFiles = result;
	    deleteNextTranscript();
	});    
} else {
    console.log("Deleting all transcripts...");
    local.getGraphIds(
	function(result, errors, messages, call) {
	    for (var e in errors) console.log("ERROR " + errors[e]);
		
	    transcriptFiles = result;
	    deleteNextTranscript();
	});    
}

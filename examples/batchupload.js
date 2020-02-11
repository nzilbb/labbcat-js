#!/usr/bin/env node

// This script uploads all Transcriber (.trs) files it can find (and corresponsing media)
// to the LaBB-CAT server below:

var labbcatUrl = "http://localhost:8080/labbcat";
var userName = "labbcat";
var password = "labbcat";
var corpus = "corpus";
var transcriptType = "interview";

console.log("Batch upload...");

var fs = require("fs");
var labbcat = require("./nzilbb.labbcat");

var local = new labbcat.Labbcat(labbcatUrl, userName, password);

function recursivelyFindTranscriberFiles(pathPrefix, directory) {
    var dirPath = (pathPrefix?pathPrefix+"/":"")+directory;
    var files = fs.readdirSync(dirPath);
    for (f in files) {
	var path = dirPath + "/" + files[f];
	var file = fs.statSync(path)
	if (file.isFile()) {
	    if (/\.trs$/.test(files[f])) {
		console.log("Found " + path);
		transcriptFiles.push(path);
	    }
	} else if (file.isDirectory()) {
	    recursivelyFindTranscriberFiles(dirPath, files[f])
	}
    }
}

function uploadNextTranscript() {
    if (transcriptFiles.length > 0) {
	// delete it from the server first
	deleteTranscript(transcriptFiles.shift());
    } else {
	console.log("Finished.");
    }
}

function deleteTranscript(transcript) {
    console.log(transcript + " ...");
    local.deleteTranscript(
	transcript,
	function(result, errors, messages, call, id) {
	    console.log("Deleted " + transcript);
	    for (var e in errors) console.log("ERROR " + errors[e]);
	    for (var m in messages) console.log("MESSAGE " + messages[m]);
	    uploadTranscript(transcript);
	});    
}
function uploadTranscript(transcript) {
    console.log("uploading " + transcript);
    var possibleMedia = [ transcript.replace(/\.trs$/,".wav"), transcript.replace(/\.trs$/,".mp3")];
    var media = [];
    for (m in possibleMedia) {
	if (fs.existsSync(possibleMedia[m])) {
	    console.log("Media: " + possibleMedia[m]);
	    media.push(possibleMedia[m]);
	}
    }
    local.newTranscript(
	transcript, media, null, transcriptType, corpus, 
	null, 
	function(result, errors, messages, call, id) {
	    console.log("Finished uploading " + id);
	    for (var e in errors) console.log("ERROR " + errors[e]);
	    for (var m in messages) console.log("MESSAGE " + messages[m]);
	    uploadNextTranscript();
	},
	function(evt) { // progress
	    if (evt.lengthComputable) {
  		var percentComplete = Math.round(evt.loaded * 100 / evt.total);
		var entry = transcripts[stripExtension(this.id)];
		entry.progress.value = percentComplete;
		entry.setStatus("Uploading...");
	    }
	});
}

var transcriptFiles = [];

console.log("Looking for transcripts...");
recursivelyFindTranscriberFiles(null,".");
console.log("Uploading...");
uploadNextTranscript();

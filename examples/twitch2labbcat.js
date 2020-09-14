#!/usr/bin/env nodejs
console.log("Convert twitch comments to text files and upload them to LaBB-CAT...");

if (!process.argv[2]) {
    console.log("Usage: " + process.argv[1] + " file [-keep-files]");
    process.exit();
}

var labbcatUrl = "http://localhost/labbcat";
var userName = "som-user-name";
var password = "some-password";

var corpus = "twitch";
var transcriptType = "comment";

var inputFile = process.argv[2];
var keepFiles = process.argv[3] == "-keep-files";

// LaBB-CAT
var labbcat = require("@nzilbb/labbcat");
var local = new labbcat.LabbcatEdit(labbcatUrl, userName, password);

// Emoji converter
var emoji = require('emoji');

// Runs the query
console.log("loading...");
var startTime = new Date();
var count = 0;
var total = 0;

var fs = require('fs');
var util = require('util');
var stream = require('stream');
var es = require('event-stream');
var s = fs.createReadStream(inputFile)
    .pipe(es.split())
    .pipe(es.mapSync(function(line){
	console.log("line " + line);
        // pause the readstream
        s.pause();
	
        // process line here and call s.resume() when rdy
        // function below was for logging memory usage
        if (line) {
	    processRow(line).then(function() {
		// resume the readstream, possibly from a callback
		s.resume();
	    });
	} else {
            // resume the readstream, possibly from a callback
            s.resume();
	}
    })
    .on('error', function(err){
        console.log('Error while reading file.', err);
    })
    .on('end', function(){
	var finishTime = new Date();
	console.log("Started " + startTime);
	console.log("Finished " + finishTime);
    })
	 );


function processRow(row) {
console.log("processRow");
    var fields = row.split('|');
    var txt = comment2txt(fields);
    // give it a file name
    var fileName = "twitch_" + fields[0] + "_" + fields[2].replace(/[^0-9]/g,"") + ".txt";
    // save it to a file
    var file = saveTranscript(fields, txt, fileName);
    var promise = uploadTranscript(fields, txt, file);
    if (!keepFiles) {
	promise = promise.then(function() {
	    // delete transcript to save space
	    fs.unlink(file);
	});
    }
    
    count++;
    if (count % 1000 == 0) // log a message every ten thousand files
	console.log(count + (total?"/"+total:"")+" - " + fileName + " - " + fields[2]);
    return promise;
}

function comment2txt(fields) {
    return 'channel_hash='+fields[1]
	+'\nis_bot='+fields[4]
	+'\npublication_time='+fields[2]
	+'\n'+fields[0]+': '+encode(fields[3]);
}

function encode(s) {
    return s	
	.replace(emoji.EMOJI_RE(), function(_, m) {
	    var em = emoji.EMOJI_MAP[m];
	    return "-emoji-"+em[0];
	})
}


function saveTranscript(fields, txt, fileName) {
console.log("savetrascnript");
    var creationTime = new Date(fields[2]);
    // put the file in a folder based on the second the post was created:
    // yyyy/MM/dd/hh/mm/yyyyMMdd_hhmmss
    var path = "./"+creationTime.getUTCFullYear();
    if (!fs.existsSync(path)) fs.mkdirSync(path);
    if (keepFiles) {
	path = path +"/"+twoDigit(creationTime.getUTCMonth() + 1);
	if (!fs.existsSync(path)) fs.mkdirSync(path);
	path = path +"/"+twoDigit(creationTime.getUTCDate());
	if (!fs.existsSync(path)) fs.mkdirSync(path);
	path = path +"/"+twoDigit(creationTime.getUTCHours());
	if (!fs.existsSync(path)) fs.mkdirSync(path);
	path = path +"/"+twoDigit(creationTime.getUTCMinutes());
	if (!fs.existsSync(path)) fs.mkdirSync(path);
	path = path +"/"+twoDigit(creationTime.getUTCSeconds());
	if (!fs.existsSync(path)) fs.mkdirSync(path);
    }
    
    fs.writeFileSync(path + "/" + fileName, txt);
    return path + "/" + fileName;
}

function twoDigit(number) {
    if (number < 10) return "0" + number;
    return number;
}

function uploadTranscript(fields, txt, file) {
    return new Promise(function(resolve,reject) {
	local.newTranscript(
	    file, null, null, transcriptType, corpus, 
	    fields[1], // family is channel
	    function(result, errors, messages, call, id) {
		console.log("Finished uploading " + id);
		for (var e in errors) console.log("ERROR " + JSON.stringify(fields) + ": " + errors[e]);
		resolve();
	    });
    });
}

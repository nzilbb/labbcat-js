#!/usr/bin/env nodejs
console.log("Convert reddit comments from BigQuery to text files and upload them to LaBB-CAT...");

if (!process.argv[2]) {
    console.log("Usage: " + process.argv[1] + " api-key-file.json project-id subreddit {keep-files|delete-files} [query-limit [start-at-row]]");
    process.exit();
}

var labbcatUrl = "http://localhost/labbcat";
var userName = "some-user-name";
var password = "some-password";
var corpus = "reddit";
var transcriptType = "comment";

var keyFile = process.argv[2];
var projectId = process.argv[3];
var subreddit = process.argv[4];
var keepFiles = process.argv[5] == "keep-files";
var queryLimit = process.argv[6];
var startAtRow = process.argv[7];

// LaBB-CAT
var labbcat = require("./nzilbb.labbcat");
var local = new labbcat.Labbcat(labbcatUrl, userName, password);

// iss? 540818136778-compute@developer.gserviceaccount.com
// API key file e6a02be83549.json
// project? peak-bebop-162220
// Imports the Google Cloud client library
const BigQuery = require('@google-cloud/bigquery');

// Instantiates a client
const bigquery = BigQuery({
    projectId: projectId,
    keyFilename: keyFile
});

var count = 0;
var total = queryLimit;

var query = "SELECT subreddit, created_utc, parent_id, link_id, id, author, body"
    +" FROM [fh-bigquery:reddit_comments.2017_02]"
    +" WHERE subreddit = '"+subreddit+"' AND body <> '[removed]' AND author <> '[deleted]'"
    +(queryLimit?" LIMIT " + queryLimit:"");
const options = {
    query: query,
    maxResults: 50,
    useLegacySql: true // Use standard SQL syntax for queries.
};

var job = null;

// Runs the query
console.log("querying...");
var startTime = new Date();
console.log("starting " + startTime);
bigquery.query(options, firstPage);

function firstPage(err, rows, apiResponse) {
    if (err) console.log("err: " + err);
    var nextQuery = {
	maxResults: options.maxResults,
	pageToken: apiResponse.pageToken
    }
    job = apiResponse.job;
    handleResults(err, rows, nextQuery, apiResponse);
}

function handleResults(err, rows, nextQuery, apiResponse) {
    if (err) console.log("err: " + err);
    var promises = [];
    for (r in rows) {
	var promise = processRow(rows[r]);
	if (promise) {
	    promises.push(promise);
	}
    }
    Promise.all(promises).then(function(values) {
	total = total || apiResponse.totalRows;
	if (!total || count < total) { // there are still results...
	    job.getQueryResults(nextQuery, handleResults);
	} else {
	    var endTime = new Date();
	    console.log("started " + startTime);
	    console.log("finished " + endTime);
	}
    });
}


function processRow(row) {
    if (startAtRow && startAtRow > count) {
	count++;
	return null;
    }
    // convert the row into a text/plain transcript
    //    var txt = comment2txt(row);
    var txt = comment2tei(row);
    // give it a file name
    var fileName = "reddit_" + row.subreddit + "_" + row.id + ".xml";
    // save it to a file
    var file = saveTranscript(row, txt, fileName);
    if (file) {
	var promise = uploadTranscript(row, txt, file);
	if (!keepFiles && false) {
	    // delete transcript to save space
	    if (fs.existsSync(file)) {
		try {
		    fs.unlink(file, function(x) {
			if (x) console.log("could not delete " + fileName + ": " + x);
		    });
		} catch (x) {
		    console.log(x);
		}
	    }
	}
	count++;
	if (count % 500 == 0) // log a message every ten thousand files
	    console.log(count + (total?"/"+total:"")+" - " + fileName + " - " + new Date(row.created_utc*1000));
	return promise;
    } else {
	return null;
    }
}

var fs = require("fs");
var stream = require('stream');
var outstream = new stream;

function comment2txt(comment) {
    return 'subreddit='+comment.subreddit
	+'\nurl=https://www.reddit.com/r/'+comment.subreddit+'/comments/'+comment.link_id.slice(3)+'#'+comment.id
	+'\npublication_time='+new Date(comment.created_utc*1000).toISOString()
	+'\nparent_id='+comment.parent_id
	+'\n'+comment.author+': '+decode(comment.body);
}

function comment2tei(comment) {
    return '<?xml version="1.0" encoding="UTF-8"?>'
	+'\n<TEI xmlns="http://www.tei-c.org/ns/1.0">'
	+'\n<teiHeader>'
	+'\n <fileDesc>'
	+'\n  <titleStmt><title>'+comment.id+'</title></titleStmt>'
	+'\n  <publicationStmt>'
	+'\n   <publisher>https://www.reddit.com/user/Stuck_In_the_Matrix</publisher>'
	+'\n   <availability status="free"><p>Published at https://www.reddit.com/r/datasets/comments/3bxlg7/i_have_every_publicly_available_reddit_comment/</p></availability>'
	+'\n  </publicationStmt>'
	+'\n  <sourceDesc>'
	+'\n   <msDesc><msIdentifier><repository>Reddit</repository>'
	+'\n    <idno type="URL">https://www.reddit.com/r/'+comment.subreddit+'/comments/'+comment.parent_id+'#'+comment.id+'</idno>'
	+'\n   </msIdentifier></msDesc>'
	+'\n  </sourceDesc>'
	+'\n    <notesStmt>'
	+'\n      <note type="subreddit">'+comment.subreddit+'</note>'
	+'\n      <note type="parent_id">'+comment.parent_id+'</note>'
	+'\n    </notesStmt>'
	+'\n </fileDesc>'
	+'\n <profileDesc>'
	+'\n  <particDesc><listPerson><person xml:id="'+comment.author+'"/></listPerson></particDesc>'
    //	+'\n  <creation><date>'+new Date(comment.retrieved_on*1000).toISOString()+'</date></creation>'
	+'\n </profileDesc>'
	+'\n</teiHeader>'
	+'\n<text>'
	+'\n <front><timeline><when xml:id="a" absolute="'+new Date(comment.created_utc*1000).toISOString()+'" /></timeline></front>'
	+'\n <body><div type="thread"><posting who="#'+comment.author+'" synch="#a">'
	+encode(comment.body)
	+'</posting></div></body>'
	+'\n</text>'
	+'\n</TEI>';
}

function decode(s) {
    return s
	.replace(/&gt;/g, ">")
	.replace(/&lt;/g, "<");
}

function encode(s) {
    return s
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;");
}

function saveTranscript(row, txt, fileName) {
    try {
	var creationTime = new Date(row.created_utc*1000);
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
    } catch (x) {
	console.log("Could not save transcript " + txt + ": " + x);
	return null;
    }
}

function twoDigit(number) {
    if (number < 10) return "0" + number;
    return number;
}

function uploadTranscript(row, txt, file) {
    return new Promise(function(resolve,reject) {
	try {
	    local.newTranscript(
		file, null, null, transcriptType, corpus, 
		row.parent_id, // family is conversation, so messages kept in same series
		function(result, errors, messages, call, id) {
		    for (var e in errors) console.log("ERROR " + id + ": " + errors[e]);
		    resolve();
		});
	} catch (x) {
	    console.log("Could not upload " + txt + ": " + x);
	    resolve();
	}
    });
}

#!/usr/bin/env nodejs
console.log(
    "Load tweets from Twitter, convert them to TEI XML documents, and upload them to LaBB-CAT...");

if (!process.argv[7]) {
    console.log(
        "Usage: " + process.argv[1]
            + " consumerKey consumerSecret accessToken accessTokenSecret"
            +" [keep-files|delete-files] handleFileName [numTweets] [requireLanguage]");
    process.exit();
}

var consumerKey = process.argv[2];
var consumerSecret = process.argv[3];
var accessToken = process.argv[4];
var accessTokenSecret = process.argv[5];
var keepFiles = process.argv[6] == "keep-files";
var handleFileName = process.argv[7];
var numTweets = process.argv[8]||100;
var requireLanguage = process.argv[9];

var screenName = null;
var followersCount = null;
var location = null;
var language = null;

var fs = require('fs');

var followersCountFileName = handleFileName + "-followers.csv";
fs.exists(followersCountFileName,function(exists){
    if (!exists) {
	fs.appendFile(followersCountFileName, "ID,followers_count,location,language", function (err) {
	    if (err)  console.log("Could not append to followers file: " + err);
	});
    }
});

var numTweetsAtOnce = 50;
var tweetCount = 0;

// LaBB-CAT
var labbcatUrl = "http://localhost:8080/labbcat";
var userName = "some-user-name";
var password = "some-password";
var corpus = "twitter";
var transcriptType = "tweet";
var labbcat = require("@nzilbb/labbcat");
var local = new labbcat.Labbcat(labbcatUrl, userName, password);

// Emoji converter
var emoji = require('emoji');

// Twitter
var Twitter = require('twitter-node-client').Twitter;

var twitter = new Twitter({
    "consumerKey": consumerKey,
    "consumerSecret": consumerSecret,
    "accessToken": accessToken,
    "accessTokenSecret": accessTokenSecret,
    "callBackUrl": ""
});

function receiveTweets(data) {
    var tweets = JSON.parse(data);
    var skipFirst = tweetCount > 0;
    var promises = [];
    for (t in tweets) {
	// after the first call, the first tweet returned is the last tweet returned by the previous call
	if (skipFirst) {
	    skipFirst = false;
	    continue;
	}
	
	var tweet = tweets[t];
	// don't count retweets
	if (!tweet.retweeted && !tweet.text.startsWith("RT ")
	    && (!requireLanguage || tweet.lang == requireLanguage)) {
	    promises.push(processTweet(tweet));
	    if (++tweetCount >= numTweets) break;
	}
    } // next tweet
    
    Promise.all(promises).then(function(values) {
	// need more?
	if (tweets.length > 1 && tweetCount < numTweets) {
	    twitter.getUserTimeline(
		{ screen_name: screenName, count: numTweetsAtOnce, max_id : tweets[tweets.length - 1].id_str},
		error, receiveTweets);
	} else { // finished this handle
	    nextHandle();
	}
    });
}

function processTweet(tweet) {
    // note the number of followers
    followersCount = tweet.user.followers_count;
    location = tweet.user.location;
    language = tweet.user.lang;
    // convert tweet to XML
    var txt = tweet2tei(tweet);
    // give it a file name
    var fileName = "twitter_" + tweet.user.screen_name + "_" + tweet.id_str + ".xml";
    // save it to a file
    var file = saveTranscript(tweet, txt, fileName);
    var promise = uploadTranscript(tweet, txt, file);
    if (!keepFiles) {
	// delete transcript to save space
	fs.unlink(file);
    }
    return promise;
}

function saveTranscript(tweet, txt, fileName) {
    var path = "./tweets";
    if (keepFiles) {
	path = path +"/"+tweet.user.screen_name
	if (!fs.existsSync(path)) fs.mkdirSync(path);
    }
    
    fs.writeFileSync(path + "/" + fileName, txt);
    return path + "/" + fileName;
}

function uploadTranscript(tweet, txt, file) {
    return new Promise(function(resolve,reject) {
	local.newTranscript(
	    file, null, null, transcriptType, corpus, 
	    tweet.user.screen_name, // family is participant name
	    function(result, errors, messages, call, id) {
		for (var e in errors) console.log("ERROR " + id + ": " + errors[e]);
		resolve();
	    });
    });
}

function error(err, response, body) {
    try {
	var o = JSON.parse(body);
	if (o.errors && o.errors[0].code == 34) {
	    console.log(screenName + " doesn't exist");
	    nextHandle();
	    return;
	}
	if (o.error == "Not authorized.") {
	    console.log(screenName + " is private");
	    nextHandle();
	    return;
	}
    } catch(x) {}
    console.log('ERROR [%s]', body);
    console.log('ERR [%s]', JSON.stringify(err));
    console.log("SKIPPING REST OF " + screenName);
    nextHandle();
}

var startTime = new Date();

var handles = null;
var h = 0;

function nextHandle() {
    // write the number of followers to file, if known
    if (screenName) {
	fs.appendFile(followersCountFileName,
		      "\n"+ screenName+","+followersCount+",\""+location+"\","+language,
		      function (err) {
			  if (err)  console.log("Could not append to followers file: " + err);
		      });
    }

    // next handle
    screenName = handles[h++];
    followersCount = null;
    location = null;
    language = null;
    tweetCount = 0;
    if (screenName) {
	console.log(screenName + " " + h + "/" + (handles.length - 1));
	// first query...
	twitter.getUserTimeline(
	    { screen_name: screenName, count: numTweetsAtOnce},
	    error, receiveTweets);
    } else { // no more handles
	var finishTime = new Date();
	console.log("Started " + startTime);
	console.log("Finished " + finishTime);
    }
}

fs.readFile(handleFileName, function(err, data) {
    handles = data.toString().split("\n");
    h = 0;
    nextHandle();
});


function tweet2tei(tweet) {
    return '<?xml version="1.0" encoding="UTF-8"?>'
	+'\n<TEI xmlns="http://www.tei-c.org/ns/1.0">'
	+'\n<teiHeader>'
	+'\n <fileDesc>'
	+'\n  <titleStmt><title>'+tweet.id_str+'</title></titleStmt>'
	+'\n  <publicationStmt>'
	+'\n   <publisher>https://www.twitter.com/</publisher>'
	+'\n   <availability status="free"><p>Published at https://www.twitter.com/</p></availability>'
	+'\n  </publicationStmt>'
	+'\n  <sourceDesc>'
	+'\n   <msDesc><msIdentifier><repository>Twitter</repository>'
	+'\n    <idno type="URL">https://twitter.com/'+tweet.user.screen_name+'/status/'+tweet.id_str+'</idno>'
	+'\n   </msIdentifier></msDesc>'
	+'\n  </sourceDesc>'
	+'\n    <notesStmt>'
	+(tweet.in_reply_to_status_id_str?'\n      <note type="parent_id">'+tweet.in_reply_to_status_id_str+'</note>':'')
	+(tweet.retweet_count>0?'\n      <note type="retweet_count">'+tweet.retweet_count+'</note>':'')
	+(tweet.geo?'\n      <note type="geo">'+tweet.geo.coordinates[0]+','+tweet.geo.coordinates[1]+'</note>':'')
	+(tweet.place?'\n      <note type="country">'+tweet.place.country+'</note>'
	  +'\n      <note type="place">'+tweet.place.name+'</note>'
	  :'')
	+'\n    </notesStmt>'
	+'\n </fileDesc>'
	+'\n <profileDesc>'
	+'\n  <particDesc><listPerson><person xml:id="'+tweet.user.screen_name+'"/></listPerson></particDesc>'
//	+'\n  <creation><date>'+new Date(comment.retrieved_on*1000).toISOString()+'</date></creation>'
	+'\n  <langUsage><language ident="'+tweet.lang+'">'+tweet.lang+'</language></langUsage>'
	+'\n </profileDesc>'
	+'\n</teiHeader>'
	+'\n<text>'
	+'\n <front><timeline><when xml:id="a" absolute="'+new Date(tweet.created_at).toISOString()+'" /></timeline></front>'
	+'\n <body><div type="thread"><posting who="#'+tweet.user.screen_name+'" synch="#a">'
	+encode(tweet.text)
	+'</posting></div></body>'
	+'\n</text>'
	+'\n</TEI>';
}

var mediumSkinToneModifier = new RegExp("<interactionTerm><emoticon style=\"emoji\" type=\"([^\"]*)\">-emoji-([^<]*)</emoticon></interactionTerm>🏽","g");
var mediumDarkSkinToneModifier = new RegExp("<interactionTerm><emoticon style=\"emoji\" type=\"([^\"]*)\">-emoji-([^<]*)</emoticon></interactionTerm>🏾","g");
var lightSkinToneModifier = new RegExp("<interactionTerm><emoticon style=\"emoji\" type=\"([^\"]*)\">-emoji-([^<]*)</emoticon></interactionTerm>🏻","g");
var mediumLightSkinToneModifier = new RegExp("<interactionTerm><emoticon style=\"emoji\" type=\"([^\"]*)\">-emoji-([^<]*)</emoticon></interactionTerm>🏼","g");
var darkSkinToneModifier = new RegExp("<interactionTerm><emoticon style=\"emoji\" type=\"([^\"]*)\">-emoji-([^<]*)</emoticon></interactionTerm>🏿","g");

function encode(s) {
    return s	
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(emoji.EMOJI_RE(), function(_, m) {
	    var em = emoji.EMOJI_MAP[m];
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+em[1]+"\">-emoji-"+em[0]+"</emoticon></interactionTerm>";
	})
	.replace(mediumSkinToneModifier, function(_, t, c) {
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+t+"\" subtype=\"medium skin tone\">-emoji-"+c+"</emoticon></interactionTerm>";
	})
	.replace(mediumDarkSkinToneModifier, function(_, t, c) {
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+t+"\" subtype=\"medium dark skin tone\">-emoji-"+c+"</emoticon></interactionTerm>";
	})
	.replace(mediumLightSkinToneModifier, function(_, t, c) {
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+t+"\" subtype=\"medium light skin tone\">-emoji-"+c+"</emoticon></interactionTerm>";
	})
	.replace(lightSkinToneModifier, function(_, t, c) {
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+t+"\" subtype=\"light skin tone\">-emoji-"+c+"</emoticon></interactionTerm>";
	})
	.replace(darkSkinToneModifier, function(_, t, c) {
	    return "<interactionTerm><emoticon style=\"emoji\" type=\""+t+"\" subtype=\"dark skin tone\">-emoji-"+c+"</emoticon></interactionTerm>";
	})
    // catch any unknown emoji
	.replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, "<interactionTerm><emoticon style=\"emoji\" type=\"?\">-emoji-</emoticon></interactionTerm>");
}

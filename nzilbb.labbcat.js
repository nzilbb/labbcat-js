/**
 * @file nzilbb.labbcat module for communicating with <a href="https://labbcat.canterbury.ac.nz/">LaBB-CAT</a> web application servers.
 * 
 * <h2>What is LaBB-CAT?</h2>
 *
 * <p>LaBB-CAT is a web-based linguistic annotation store that stores audio or video
 * recordings, text transcripts, and other annotations.</p>
 *
 * <p>Annotations of various types can be automatically generated or manually added.</p>
 *
 * <p>LaBB-CAT servers are usually password-protected linguistic corpora, and can be
 * accessed manually via a web browser, or programmatically using a client library like
 * this one.</p>
 * 
 * <h2>What is this library?</h2>
 * 
 * <p>The library copies from  
 *   <a href="https://nzilbb.github.io/ag/javadoc/nzilbb/ag/IGraphStoreQuery.html">nzilbb.ag.IGraphStoreQuery</a>
 *   and related Java interfaces, for standardized API calls.</p>
 *
 * <p><em>nzilbb.labbcat</em> is available as an <em>npm</em> package
 *   <a href="https://www.npmjs.com/package/@nzilbb/labbcat">here.</a></p>
 * 
 * <p><em>nzilbb.labbcat.js</em> can also be used as a browser-importable script.</p>
 * 
 * <p>This API is has the following object model:
 * <dl>
 *  <dt>{@link LabbcatView}</dt><dd> implements read-only functions for a LaBB-CAT graph
 *   store, corresponding to <q>view</q> permissions in LaBB-CAT.</dd>
 *  <dt>{@link LabbcatEdit}</dt><dd> inherits all LabbcatView functions, and also
 *   implements some graph store editing functions, corresponding to <q>edit</q>
 *   permissions in LaBB-CAT.</dd>
 *  <dt>{@link LabbcatAdmin}</dt><dd> inherits all LabbcatEdit functions, and also
 *   implements some administration functions, corresponding to <q>admin</q>
 *   permissions in LaBB-CAT.</dd>
 * </dl> 
 *
 * @example
 * const corpus = new labbcat.LabbcatView("https://sometld.com", "your username", "your password");
 * 
 * // get the first participant in the corpus
 * corpus.getParticipantIds((ids, errors, messages)=>{
 *     const participantId = ids[0];
 *     
 *     // all their instances of "the" followed by a word starting with a vowel
 *     const pattern = [
 *         {"orthography" : "i"},
 *         {"phonemes" : "[cCEFHiIPqQuUV0123456789~#\\$@].*"}];
 *     
 *     // start searching
 *     corpus.search(pattern, [ participantId ], false, (response, errors, messages)=>{
 *         const taskId = response.threadId
 *                 
 *         // wait for the search to finish
 *         corpus.waitForTask(taskId, 30, (task, errors, messages)=>{
 *             
 *             // get the matches
 *             corpus.getMatches(taskId, (result, errors, messages)=>{
 *                 const matches = result.matches;
 *                 console.log("There were " + matches.length + " matches for " + participantId);
 *                 
 *                 // get TextGrids of the utterances
 *                 corpus.getFragments(
 *                     matches, [ "orthography", "phonemes" ], "text/praat-textgrid",
 *                     (textgrids, errors, messages)=>{
 *                         
 *                         for (let textgrid of textgrids) {
 *                             console.log(textgrid);
 *                         }
 *                         
 *                         // get the utterance recordings
 *                         corpus.getSoundFragments(matches, (wavs, errors, messages)=>{
 *                             
 *                             for (let wav of wavs) {
 *                                 console.log(wav);
 *                             }
 *                         });
 *                     });
 *             });
 *         });
 *     });
 * });
 *
 * @author Robert Fromont robert.fromont@canterbury.ac.nz
 * @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL v3.0
 * @copyright 2016-2020 New Zealand Institute of Language, Brain and Behaviour, University of Canterbury
 *
 *    This file is part of LaBB-CAT.
 *
 *    LaBB-CAT is free software; you can redistribute it and/or modify
 *    it under the terms of the GNU General Public License as published by
 *    the Free Software Foundation; either version 3 of the License, or
 *    (at your option) any later version.
 *
 *    LaBB-CAT is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public License
 *    along with LaBB-CAT; if not, write to the Free Software
 *    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 * @lic-end
 */

(function(exports){

    var runningOnNode = false;

    if (typeof(require) == "function") { // running on node.js
        XMLHttpRequest = require('xhr2');
        FormData = require('form-data');
        fs = require('fs');
        path = require('path');
        os = require('os');
        btoa = require('btoa');
        parseUrl = require('url').parse;
        runningOnNode = true;
    }

    /**
     * Callback invoked when the result of a request is available.
     *
     * @callback resultCallback
     * @param result The result of the function. This may be null, a string, number,
     * array, or complex object, depending on what function was called.
     * @param {string[]} errors A list of errors, or null if there were no errors.
     * @param {string[]} messages A list of messages from the server if any.
     * @param {string} call The name of the function that was called
     * @param {string} id The ID that was passed to the method, if any.
     */
    
    function callComplete(evt) {
        if (exports.verbose) console.log("callComplete: " + this.responseText);
	var result = null;
	var errors = null;
	var messages = null;
        try {
	    var response = JSON.parse(this.responseText);
            if (response.model != null) {
                if (response.model.result) {
                    result = response.model.result;
                    if (evt.target.call == "newTranscript"
                        || evt.target.call == "updateTranscript") {
                        // for these calls, the result is an object with one key, whose
                        // value is the threadId - so just return that
                        result = result[evt.target.id];
                    }
                }
	        if (!result && result != 0) result = response.model;
            }
            if (exports.verbose) console.log("result: " + JSON.stringify(result));
	    var errors = response.errors;
	    if (!errors || errors.length == 0) errors = null;
	    var messages = response.messages;
	    if (!messages || messages.length == 0) messages = null;
        } catch(exception) {
            result = null;
            errors = ["" +exception+ ": " + this.responseText];
            messages = [];
        }
        if (evt.target.onResult) {
            evt.target.onResult(result, errors, messages, evt.target.call, evt.target.id);
        }
    }
    function callFailed(evt) {
        if (exports.verbose) console.log("callFailed: "+this.responseText);
        if (evt.target.onResult) {
            evt.target.onResult(
                null, ["failed: " + this.responseText], [], evt.target.call, evt.target.id);
        }
    }
    function callCancelled(evt) {
        if (exports.verbose) console.log("callCancelled");
        if (evt.target.onResult) {
            evt.target.onResult(null, ["cancelled"], [], evt.target.call, evt.target.id);
        }
    }

    // LabbcatView class - read-only "view" access
    
    /**
     * Read-only querying of LaBB-CAT corpora, based on the  
     * <a href="https://nzilbb.github.io/ag/javadoc/nzilbb/ag/IGraphStoreQuery.html">nzilbb.ag.IGraphStoreQuery</a>
     * interface.
     * <p>This interface provides only <em>read-only</em> operations.
     * @example
     * // create annotation store client
     * const store = new LabbcatView("https://labbcat.canterbury.ac.nz", "demo", "demo");
     * // get some basic information
     * store.getId((result, errors, messages, call)=>{ 
     *     console.log("id: " + result); 
     *   });
     * store.getLayerIds((layers, errors, messages, call)=>{ 
     *     for (l in result) console.log("layer: " + layers[l]); 
     *   });
     * store.getCorpusIds((corpora, errors, messages, call)=>{ 
     *     store.getTranscriptIdsInCorpus(corpora[0], (ids, errors, messages, call, id)=>{ 
     *         console.log("transcripts in: " + id); 
     *         for (i in ids) console.log(ids[i]);
     *       });
     *   });
     * @author Robert Fromont robert@fromont.net.nz
     */
    class LabbcatView {
        /** 
         * Create a query client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link)
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            if (!/\/$/.test(baseUrl)) baseUrl += "/";
            this._baseUrl = baseUrl;
            this._storeUrl = baseUrl + "api/store/";
            
            this._username = username;
            this._password = password;
        }
        
        /**
         * The base URL - e.g. https://labbcat.canterbury.ac.nz/demo/api/store/
         */
        get baseUrl() {
            return this._baseUrl;
        }
        
        /**
         * The graph store URL - e.g. https://labbcat.canterbury.ac.nz/demo/api/store/
         */
        get storeUrl() {
            return this._storeUrl;
        }
        set storeUrl(url) {
            this._storeUrl = url;
        }
        
        /**
         * The LaBB-CAT user name.
         */
        get username() {
            return this._username;
        }
        
        //
        // Creates an http request.
        // @param {string} call The name of the API function to call
        // @param {object} parameters The arguments of the function, if any
        // @param {resultCallback} onResult Invoked when the request has returned a result.
        // @param {string} [url=this.storeUrl] The URL
        // @param {string} [method=GET] The HTTP method e.g. "POST"
        // @param {string} [storeUrl=null] The URL for the graph store.
        // @return {XMLHttpRequest} An open request.
        //
        createRequest(call, parameters, onResult, url, method, storeUrl) {
            if (exports.verbose)  {
                console.log("createRequest "+method+" "+url + " "
                            + call + " " + JSON.stringify(parameters));
            }
            method = method || "GET";
            
	    var xhr = new XMLHttpRequest();
	    xhr.call = call;
	    if (parameters && parameters.id) xhr.id = parameters.id;
	    xhr.onResult = onResult;
	    xhr.addEventListener("load", callComplete, false);
	    xhr.addEventListener("error", callFailed, false);
	    xhr.addEventListener("abort", callCancelled, false);
	    var queryString = "";
	    if (parameters) {
	        for (var key in parameters) {
		    if (parameters[key]) {
  		        if (parameters[key].constructor === Array) {
			    for (var i in parameters[key]) {
			        queryString += "&"+key+"="+encodeURIComponent(parameters[key][i])
			    }
		        } else {
			    queryString += "&"+key+"="+encodeURIComponent(parameters[key])
		        }
		    }
	        } // next parameter
	    }
            queryString = queryString.replace(/^&/,"?");
	    if (!url) {
                storeUrl = storeUrl || this.storeUrl;
                if (exports.verbose) {
                    console.log(method + ": "+storeUrl + call + queryString + " as " + this.username);
                }
	        xhr.open(method, storeUrl + call + queryString, true);
            } else { // explicit URL, so don't append call
                if (exports.verbose) {
                    console.log(method + ": "+url + queryString + " as " + this.username);
                }
	        xhr.open(method, url + queryString, true);
            }
	    if (this.username) {
	        xhr.setRequestHeader(
                    "Authorization", "Basic " + btoa(this.username + ":" + this._password))
 	    }
	    xhr.setRequestHeader("Accept", "application/json");
	    return xhr;
        }
        
        /**
         * Gets the store's ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string} The annotation store's ID.
         */
        getId(onResult) {
	    this.createRequest("getId", null, onResult).send();
        }
        
        /**
         * Gets a list of layer IDs (annotation 'types').
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of layer IDs.
         */
        getLayerIds(onResult) {
	    this.createRequest("getLayerIds", null, onResult).send();
        }
        
        /**
         * Gets a list of layer definitions.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  A list of layer definitions.
         */
        getLayers(onResult) {
	    this.createRequest("getLayers", null, onResult).send();
        }
        
        /**
         * Gets the layer schema.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  A schema defining the layers and how they
         * relate to each other. 
         */
        getSchema(onResult) {
	    this.createRequest("getSchema", null, onResult).send();
        }
        
        /**
         * Gets a layer definition.
         * @param {string} id ID of the layer to get the definition for.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: The definition of the given layer.
         */
        getLayer(id, onResult) {
	    var xhr = this.createRequest("getLayer", { id : id }, onResult).send();
        }
        
        /**
         * Gets a list of corpus IDs.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of corpus IDs.
         */
        getCorpusIds(onResult) {
	    this.createRequest("getCorpusIds", null, onResult).send();
        }
        
        /**
         * Gets a list of participant IDs.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: {string[]} A list of participant IDs.
         */
        getParticipantIds(onResult) {
	    this.createRequest("getParticipantIds", null, onResult).send();
        }

        /**
         * Gets the participant record specified by the given identifier.
         * @param id The ID of the participant, which could be their name or their
         * database annotation ID. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:   An annotation representing the participant,
         * or null if the participant was not found.
         */
        getParticipant(id, onResult) {
	    this.createRequest("getParticipant", {id : id}, onResult).send();
        }
        
        /**
         * Counts the number of participants that match a particular pattern.
         * @param {string} expression An expression that determines which participants match.
         * <p> The expression language is loosely based on JavaScript; expressions such as the
         * following can be used: 
         * <ul>
         *  <li><code>/Ada.+/.test(id)</code></li>
         *  <li><code>labels('corpus').includes('CC')</code></li>
         *  <li><code>labels('participant_languages').includes('en')</code></li>
         *  <li><code>labels('transcript_language').includes('en')</code></li>
         *  <li><code>!/Ada.+/.test(id) &amp;&amp; my('corpus').label == 'CC'</code></li>
         *  <li><code>list('transcript_rating').length &gt; 2</code></li>
         *  <li><code>list('participant_rating').length = 0</code></li>
         *  <li><code>!annotators('transcript_rating').includes('labbcat')</code></li>
         *  <li><code>my('participant_gender').label == 'NA'</code></li>
         * </ul>
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: The number of matching participants.
         */
        countMatchingParticipantIds(expression, onResult) {
	    this.createRequest("countMatchingParticipantIds", {
                expression : expression
            }, onResult).send();
        }
        
        /**
         * Gets a list of IDs of participants that match a particular pattern.
         * @param {string} expression An expression that determines which participants match.
         * <p> The expression language is loosely based on JavaScript; expressions such as the
         * following can be used: 
         * <ul>
         *  <li><code>/Ada.+/.test(id)</code></li>
         *  <li><code>labels('corpus').includes('CC')</code></li>
         *  <li><code>labels('participant_languages').includes('en')</code></li>
         *  <li><code>labels('transcript_language').includes('en')</code></li>
         *  <li><code>!/Ada.+/.test(id) &amp;&amp; my('corpus').label == 'CC'</code></li>
         *  <li><code>list('transcript_rating').length &gt; 2</code></li>
         *  <li><code>list('participant_rating').length = 0</code></li>
         *  <li><code>!annotators('transcript_rating').includes('labbcat')</code></li>
         *  <li><code>my('participant_gender').label == 'NA'</code></li>
         * </ul>
         * @param {int} [pageLength] The maximum number of IDs to return, or null to return all.
         * @param {int} [pageNumber] The zero-based page number to return, or null to return the
         * first page. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: A list of participant IDs.
         */
        getMatchingParticipantIds(expression, pageLength, pageNumber, onResult) {
            if (typeof pageLength === "function") { // no pageLength, pageNumber
                onResult = pageLength;
                pageLength = null;
                pageNumber = null;
            }
	    this.createRequest("getMatchingParticipantIds", {
                expression : expression,
                pageLength : pageLength,
                pageNumber : pageNumber
            }, onResult).send();
        }

        /**
         * Counts the number of transcripts that match a particular pattern.
         * @param {string} expression An expression that determines which transcripts match.
         * <p> The expression language is loosely based on JavaScript; expressions such as
         * the following can be used: 
         * <ul>
         *  <li><code>/Ada.+/.test(id)</code></li>
         *  <li><code>labels('participant').includes('Robert')</code></li>
         *  <li><code>('CC', 'IA', 'MU').includes(my('corpus').label)</code></li>
         *  <li><code>my('episode').label == 'Ada Aitcheson'</code></li>
         *  <li><code>my('transcript_scribe').label == 'Robert'</code></li>
         *  <li><code>my('participant_languages').label == 'en'</code></li>
         *  <li><code>my('noise').label == 'bell'</code></li>
         *  <li><code>labels('transcript_languages').includes('en')</code></li>
         *  <li><code>labels('participant_languages').includes('en')</code></li>
         *  <li><code>labels('noise').includes('bell')</code></li>
         *  <li><code>list('transcript_languages').length gt; 1</code></li>
         *  <li><code>list('participant_languages').length gt; 1</code></li>
         *  <li><code>list('transcript').length gt; 100</code></li>
         *  <li><code>annotators('transcript_rating').includes('Robert')</code></li>
         *  <li><code>!/Ada.+/.test(id) &amp;&amp; my('corpus').label == 'CC' &amp;&amp;
         * labels('participant').includes('Robert')</code></li> 
         * </ul>
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: The number of matching transcripts.
         */
        countMatchingTranscriptIds(expression, onResult) {
	    this.createRequest("countMatchingTranscriptIds", {
                expression : expression
            }, onResult).send();
        }    

        /**
         * <p>Gets a list of IDs of transcripts that match a particular pattern.
         * <p>The results can be exhaustive, by omitting pageLength and pageNumber, or they
         * can be a subset (a 'page') of results, by given pageLength and pageNumber values.</p>
         * <p>The order of the list can be specified.  If ommitted, the transcripts are
         * listed in ID order.</p> 
         * @param {string} expression An expression that determines which transcripts match.
         * <p> The expression language is loosely based on JavaScript; expressions such as
         * the following can be used:
         * <ul>
         *  <li><code>/Ada.+/.test(id)</code></li>
         *  <li><code>labels('participant').includes('Robert')</code></li>
         *  <li><code>('CC', 'IA', 'MU').includes(my('corpus').label)</code></li>
         *  <li><code>my('episode').label == 'Ada Aitcheson'</code></li>
         *  <li><code>my('transcript_scribe').label == 'Robert'</code></li>
         *  <li><code>my('participant_languages').label == 'en'</code></li>
         *  <li><code>my('noise').label == 'bell'</code></li>
         *  <li><code>labels('transcript_languages').includes('en')</code></li>
         *  <li><code>labels('participant_languages').includes('en')</code></li>
         *  <li><code>labels('noise').includes('bell')</code></li>
         *  <li><code>list('transcript_languages').length gt; 1</code></li>
         *  <li><code>list('participant_languages').length gt; 1</code></li>
         *  <li><code>list('transcript').length gt; 100</code></li>
         *  <li><code>annotators('transcript_rating').includes('Robert')</code></li>
         *  <li><code>!/Ada.+/.test(id) &amp;&amp; my('corpus').label == 'CC' &amp;&amp;
         * labels('participant').includes('Robert')</code></li> 
         * </ul>
         * @param {int} [pageLength] The maximum number of IDs to return, or null to return all.
         * @param {int} [pageNumber] The zero-based page number to return, or null to return
         * the first page. 
         * @param {string} [order] The ordering for the list of IDs, a string containing a
         * comma-separated list of 
         * expressions, which may be appended by " ASC" or " DESC", or null for transcript ID order. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: A list of transcript IDs.
         */
        getMatchingTranscriptIds(expression, pageLength, pageNumber, order, onResult) {
            if (typeof pageLength === "function") { // (expression, onResult)
                onResult = pageLength;
                pageLength = null;
                pageNumber = null;
                order = null;
            } else if (typeof pageNumber === "function") { // (order, onResult)
                order = pageLength;
                onResult = pageNumber;
                pageLength = null;
                pageNumber = null;
            } else if (typeof order === "function") { // (pageLength, pageNumber, onResult)
                onResult = order;
                order = null;
            }
	    this.createRequest("getMatchingTranscriptIds", {
                expression : expression,
                pageLength : pageLength,
                pageNumber : pageNumber,
                order : order
            }, onResult).send();
        }
        
        /**
         * Gets the number of annotations on the given layer of the given transcript.
         * @param {string} id The ID of the transcript.
         * @param {layerId} The ID of the layer.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: A (possibly empty) array of annotations.
         */
        countAnnotations(id, layerId, onResult) {
	    this.createRequest("countAnnotations", {
                id : id,
                layerId : layerId
            }, onResult).send();
        }
        
        /**
         * Gets the annotations on the given layer of the given transcript.
         * @param {string} id The ID of the transcript.
         * @param {string} layerId The ID of the layer.
         * @param {int} [pageLength] The maximum number of IDs to return, or null to return all.
         * @param {int} [pageNumber] The zero-based page number to return, or null to return 
         * the first page. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: A (possibly empty) array of annotations.
         */
        getAnnotations(id, layerId, pageLength, pageNumber, onResult) {
            if (typeof pageLength === "function") { // (id, layerId, onResult)
                onResult = pageLength;
                pageLength = null;
                pageNumber = null;
            }
	    this.createRequest("getAnnotations", {
                id : id,
                layerId : layerId,
                pageLength : pageLength,
                pageNumber : pageNumber
            }, onResult).send();
        }
        
        /**
         * Counts the number of annotations that match a particular pattern.
         * @param {string} expression An expression that determines which participants match.
         * <p> The expression language is loosely based on JavaScript; expressions such as
         * the following can be used:
         * <ul>
         *  <li><code>id == 'ew_0_456'</code></li>
         *  <li><code>!/th[aeiou].&#47;/.test(label)</code></li>
         *  <li><code>my('participant').label == 'Robert' &amp;&amp; my('utterances').start.offset ==
         * 12.345</code></li> 
         *  <li><code>graph.id == 'AdaAicheson-01.trs' &amp;&amp; layer.id == 'orthography'
         * &amp;&amp; start.offset &gt; 10.5</code></li> 
         *  <li><code>previous.id == 'ew_0_456'</code></li>
         * </ul>
         * </ul>
         * <p><em>NB</em> all expressions must match by either id or layer.id.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: The number of matching annotations.
         */
        countMatchingAnnotations(expression, onResult) {
	    this.createRequest("countMatchingAnnotations", {
                expression : expression
            }, onResult).send();
        }
        
        /**
         * Gets a list of annotations that match a particular pattern.
         * @param {string} expression An expression that determines which transcripts match.
         * <p> The expression language is loosely based on JavaScript; expressions such as the
         * following can be used: 
         * <ul>
         *  <li><code>id == 'ew_0_456'</code></li>
         *  <li><code>!/th[aeiou].&#47;/.test(label)</code></li>
         *  <li><code>my('participant').label == 'Robert' &amp;&amp; my('utterances').start.offset ==
         * 12.345</code></li> 
         *  <li><code>graph.id == 'AdaAicheson-01.trs' &amp;&amp; layer.id == 'orthography'
         * &amp;&amp; start.offset &gt; 10.5</code></li> 
         *  <li><code>previous.id == 'ew_0_456'</code></li>
         * </ul>
         * <p><em>NB</em> all expressions must match by either id or layer.id.
         * @param {int} [pageLength] The maximum number of annotations to return, or null
         * to return all. 
         * @param {int} [pageNumber] The zero-based page number to return, or null to
         * return the first page. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: A list of matching Annotations.
         */
        getMatchingAnnotations(expression, pageLength, pageNumber, onResult) {
            if (typeof pageLength === "function") { // (expression, onResult)
                onResult = pageLength;
                pageLength = null;
                pageNumber = null;
                order = null;
            }
	    this.createRequest("getMatchingAnnotations", {
                expression : expression,
                pageLength : pageLength,
                pageNumber : pageNumber
            }, onResult).send();
        }
        
        /**
         * Gets a list of transcript IDs.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of transcript IDs.
         */
        getTranscriptIds(onResult) {
	    this.createRequest("getTranscriptIds", null, onResult).send();
        }
        
        /**
         * Gets a list of transcript IDs in the given corpus.
         * @param {string} id A corpus ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of transcript IDs.
         */
        getTranscriptIdsInCorpus(id, onResult) {
	    this.createRequest("getTranscriptIdsInCorpus", { id : id }, onResult).send();
        }
        
        /**
         * Gets a list of IDs of transcripts that include the given participant.
         * @param {string} id A participant ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of transcript IDs.
         */
        getTranscriptIdsWithParticipant(id, onResult) {
	    this.createRequest("getTranscriptIdsWithParticipant", { id : id }, onResult).send();
        }
        
        /**
         * Gets a transcript given its ID, containing only the given layers.
         * @param {string} id The given transcript ID.
         * @param {string[]} layerId The IDs of the layers to load, or null for all
         * layers. If only transcript data is required, set this to ["graph"]. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified transcript.
         */
        getTranscript (id, layerId, onResult) {
	    this.createRequest("getTranscript", { id : id, layerId : layerId }, onResult).send();
        }
        
        /**
         * Gets the given anchors in the given transcript.
         * @param {string} id The given transcript ID.
         * @param {string[]} anchorIds The IDs of the anchors to load.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified transcript.
         */
        getAnchors (id, anchorIds, onResult) {
	    this.createRequest("getAnchors", { id : id, anchorIds : anchorIds }, onResult).send();
        }
        
        /**
         * List the predefined media tracks available for transcripts.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  An ordered list of media track definitions.
         */
        getMediaTracks(onResult) {
	    this.createRequest("getMediaTracks", null, onResult).send();
        }
        
        /**
         * List the media available for the given transcript.
         * @param {string} id The transcript ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  List of media files available for the given transcript.
         */
        getAvailableMedia(id, onResult) {
	    this.createRequest("getAvailableMedia", { id : id }, onResult).send();
        }
        
        /**
         * Get a list of documents associated with the episode of the given transcript.
         * @param {string} id The transcript ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  List of media files available for the given transcript.
         */
        getEpisodeDocuments(id, onResult) {
	    this.createRequest("getEpisodeDocuments", { id : id }, onResult).send();
        }
        
        /**
         * Gets a given media track for a given transcript.
         * @param {string} id The transcript ID.
         * @param {string} trackSuffix The track suffix of the media.
         * @param {string} mimeType The MIME type of the media.
         * @param {float} [startOffset] The start offset of the media sample, or null for
         * the start of the whole recording. 
         * @param {float} [endOffset[ The end offset of the media sample, or null for the
         * end of the whole recording. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: {string} A URL to the given media for the given
         * transcript, or null if the given media doesn't exist.
         */
        getMedia(id, trackSuffix, mimeType, startOffset, endOffset, onResult) {
            if (typeof startOffset === "function") { // (id, trackSuffix, mimeType, onResult)
                onResult = startOffset;
                startOffset = null;
                endOffset = null;
            }
	    this.createRequest("getMedia", {
                id : id,
                trackSuffix : trackSuffix,
                mimeType : mimeType,
                startOffset : startOffset,
                endOffset : endOffset
            }, onResult).send();
        }

        /**
         * Gets list of tasks.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * result, which is an map of task IDs to statuses.
         */
        getTasks(onResult) {
            if (exports.verbose) console.log("getTasks()");
            this.createRequest("getTasks", null, onResult, this.baseUrl + "threads").send();
        }
        
        /**
         * Gets the status of a task.
         * @param {string} id ID of the task.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        taskStatus(id, onResult) {
            this.createRequest("taskStatus", { id : id, threadId : id }, onResult, this.baseUrl+"thread").send();
        }

        /**
         * Wait for the given task to finish.
         * @param {string} threadId The task ID.
         * @param {int} maxSeconds The maximum time to wait for the task, or 0 for forever.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: The final task status. To determine whether
         * the task finished or waiting timed out, check <var>result.running</var>, which
         * will be false if the task finished.
         */
        waitForTask(threadId, maxSeconds, onResult) {
            if (exports.verbose) console.log("waitForTask("+threadId+", "+maxSeconds+")");
            const labbcat = this;
            this.taskStatus(threadId, (thread, errors, messages)=> {
                const waitTimeMS = thread && thread.refreshSeconds?
                      thread.refreshSeconds*1000 : 2000;
                if (thread.running && maxSeconds > waitTimeMS/1000) {
                    setTimeout(()=>labbcat.waitForTask(
                        threadId, maxSeconds - waitTimeMS/1000, onResult), waitTimeMS);
                } else {
                    if (onResult) {
                        onResult(thread, errors, messages);
                    }
                }
            });
        }

        /**
         * Releases a finished task so it no longer uses resources on the server.
         * @param {string} id ID of the task.
         * @param {resultCallback} onResult Invoked when the request has completed.
         */
        releaseTask(id, onResult) {
            if (exports.verbose) console.log("releaseTask("+threadId+")");
            this.createRequest("releaseTask", {
                threadId : id,
                command : "release"
            }, onResult, this.baseUrl+"threads").send();
        }
        
        /**
         * Cancels a running task.
         * @param threadId The ID of the task.
         * @param {resultCallback} onResult Invoked when the request has completed.
         */
        cancelTask(threadId, onResult) {
            if (exports.verbose) console.log("cancelTask("+threadId+")");
            this.createRequest("cancelTask", {
                threadId : threadId,
                command : "cancel"
            }, onResult, this.baseUrl+"threads").send();
        }
        
        /**
         * Searches for tokens that match the given pattern.
         * <p> Although <var>mainParticipant</var>, <var>aligned</var> and
         * <var>matchesPerTranscript</var> are all optional, if one of them is specified,
         * then all must be specified.
         * <p> The <var>pattern</var> should match the structure of the search matrix in the
         * browser interface of LaBB-CAT. This is a JSON object with one attribute called
         * <q>columns</q>, which is an array of JSON objects.
         * <p>Each element in the <q>columns</q> array contains am JSON object named
         * <q>layers</q>, whose value is a JSON object for patterns to match on each layer, and
         * optionally an element named <q>adj</q>, whose value is a number representing the
         * maximum distance, in tokens, between this column and the next column - if <q>adj</q>
         * is not specified, the value defaults to 1, so tokens are contiguous.
         * Each element in the <q>layers</q> JSON object is named after the layer it matches, and
         * the value is a named list with the following possible attributes:
         * <dl>
         *  <dt>pattern</dt> <dd>A regular expression to match against the label</dd>
         *  <dt>min</dt> <dd>An inclusive minimum numeric value for the label</dd>
         *  <dt>max</dt> <dd>An exclusive maximum numeric value for the label</dd>
         *  <dt>not</dt> <dd>TRUE to negate the match</dd>
         *  <dt>anchorStart</dt> <dd>TRUE to anchor to the start of the annotation on this layer
         *     (i.e. the matching word token will be the first at/after the start of the matching
         *     annotation on this layer)</dd>
         *  <dt>anchorEnd</dt> <dd>TRUE to anchor to the end of the annotation on this layer
         *     (i.e. the matching word token will be the last before/at the end of the matching
         *     annotation on this layer)</dd>
         *  <dt>target</dt> <dd>TRUE to make this layer the target of the search; the results will
         *     contain one row for each match on the target layer</dd>
         * </dl>
         *
         * <p>Examples of valid pattern objects include:
         * <pre>// words starting with 'ps...'
         * const pattern1 = {
         *     "columns" : [
         *         {
         *             "layers" : {
         *                 "orthography" : {
         *                     "pattern" : "ps.*"
         *                 }
         *             }
         *         }
         *     ]};
         * 
         * // the word 'the' followed immediately or with one intervening word by
         * // a hapax legomenon (word with a frequency of 1) that doesn't start with a vowel
         * const pattern2 = {
         *     "columns" : [
         *         {
         *             "layers" : {
         *                 "orthography" : {
         *                     "pattern" : "the"
         *                 }
         *             }
         *             "adj" : 2 },
         *         {
         *             "layers" : {
         *                 "phonemes" : {
         *                     "not" : true,
         *                     "pattern" : "[cCEFHiIPqQuUV0123456789~#\\$@].*"}
         *                 "frequency" {
         *                     "max" : "2"
         *                 }
         *             }
         *         }
         *     ]};
         * </pre>
         *
         * For ease of use, the function will also accept the following abbreviated forms:
         * <pre>
         * // a single list representing a 'one column' search, 
         * // and string values, representing regular expression pattern matching
         * const pattern3 = { orthography : "ps.*" };
         *
         * // a list containing the columns (adj defaults to 1, so matching tokens are contiguous)
         * const pattrn4 = [{
         *     orthography : "the"
         * }, {
         *     phonemes : {
         *         not : true,
         *         pattern : "[cCEFHiIPqQuUV0123456789~#\\$@].*" },
         *     frequency : {
         *         max = "2" }
         * }];
         * </pre>
         * @param {object} pattern An object representing the pattern to search for, which
         * mirrors the Search Matrix in the browser interface.
         * @param {string[]} [participantIds=null] An optional list of participant IDs to search
         * the utterances of. If not null, all utterances in the corpus will be searched.
         * @param {string[]} [transcriptTypes=null] An optional list of transcript types to limit
         * the results to. If null, all transcript types will be searched. 
         * @param {boolean} [mainParticipant=true] true to search only main-participant
         * utterances, false to search all utterances. 
         * @param {boolean} [aligned=false] true to include only words that are aligned (i.e. have
         * anchor confidence &ge; 50, false to search include un-aligned words as well. 
         * @param {int} [matchesPerTranscript=null] Optional maximum number of matches per
         * transcript to return. <tt>null</tt> means all matches.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: An object with one attribute, "threadId",
         * which identifies the resulting task, which can be passed to 
         * {@link Labbcat#getMatches}, {@link Labbcat#taskStatus}, 
         * {@link Labbcat#waitForTask}, etc.
         */
        search(pattern, participantIds, transcriptTypes, mainParticipant, aligned, matchesPerTranscript, onResult) {
            if (typeof participantIds === "function") { // (pattern, onResult)
                onResult = participantIds;
                participantIds = null;
                transcriptTypes = null;
                mainParticipant = true;
                aligned = false;
                matchesPerTranscript = null;
            } else if (typeof transcriptTypes === "function") {
                // (pattern, participantIds, onResult)
                onResult = transcriptTypes;
                transcriptTypes = null;
                mainParticipant = true;
                aligned = false;
                matchesPerTranscript = null;
            } else if (typeof transcriptTypes === "boolean") {
                // (pattern, participantIds, mainParticipant, aligned,
                // matchesPerTranscript, onResult) 
                onResult = matchesPerTranscript;
                matchesPerTranscript = aligned;
                aligned = mainParticipant;
                mainParticipant = transcriptTypes;
                transcriptTypes = null;
            }
            if (typeof aligned === "function") {
                // (pattern, participantIds, mainParticipant, onResult)
                // i.e. the original signature of this function
                onResult = aligned;
                aligned = false;
                matchesPerTranscript = null;
            }
            if (exports.verbose) {
                console.log("search("+JSON.stringify(pattern)
                            +", "+JSON.stringify(participantIds)
                            +", "+JSON.stringify(transcriptTypes)
                            +", "+mainParticipant+")"
                            +", "+aligned+")"
                            +", "+matchesPerTranscript+")");
            }

            // first normalize the pattern...

            // if pattern isn't a list with a "columns" element, wrap a list around it
            if (!pattern.columns) pattern = { columns : pattern };

            // if pattern.columns isn't an array wrap an array list around it
            if (!(pattern.columns instanceof Array)) pattern.columns = [ pattern.columns ];

            // columns contain lists with no "layers" element, wrap a list around them
            for (let c = 0; c < pattern.columns.length; c++) {
                if (!("layers" in pattern.columns[c])) {
                    pattern.columns[c] = { layers : pattern.columns[c] };
                }
            } // next column

            // convert layer:string to layer : { pattern:string }
            for (let c = 0; c < pattern.columns.length; c++) { // for each column
                for (let l in pattern.columns[c].layers) { // for each layer in the column
                    // if the layer value isn't an object
                    if (typeof pattern.columns[c].layers[l] == "string") {
                        // wrap a list(pattern=...) around it
                        pattern.columns[c].layers[l] = { pattern : pattern.columns[c].layers[l] };
                    } // value isn't a list
                } // next layer
            } // next column

            const parameters = {
                command : "search",
                searchJson : JSON.stringify(pattern),
                words_context : 0
            }
            if (mainParticipant) parameters.only_main_speaker = true;
            if (aligned) parameters.only_aligned = true;
            if (matchesPerTranscript) parameters.matches_per_transcript = matchesPerTranscript;
            if (participantIds) parameters.participant_id = participantIds;
            if (transcriptTypes) parameters.transcript_type = transcriptTypes;

            this.createRequest("search", parameters, onResult, this.baseUrl+"search").send();
        }
        
        /**
         * Gets a list of tokens that were matched by {@link Labbcat#search}.
         * <p>If the task is still running, then this function will wait for it to finish.
         * <p>This means calls can be stacked like this:
         *  <pre>const matches = labbcat.getMatches(
         *     labbcat.search(
         *        {"orthography", "and"},
         *        participantIds, true), 1);</pre>
         * @param {string} threadId A task ID returned by {@link Labbcat#search}.
         * @param {int} [wordsContext=0] Number of words context to include in the <q>Before
         * Match</q> and <q>After Match</q> columns in the results.
         * @param {int} [pageLength] The maximum number of matches to return, or null to
         * return all. 
         * @param {int} [pageNumber] The zero-based page number to return, or null to
         * return the first page.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: An object with two attributes:
         * <dl>
         *  <dt>name</dt><dd>The name of the search results collection</dd>
         *  <dt>matches</dt>
         *   <dd>A list of match objects, with the following attributes
         *    <dl>
         *      <dt>MatchId</dt> <dd>A string identifying the match, of the kind expected
         *        by {@link Labbcat#getMatchAnnotations}</dd>
         *      <dt>Transcript</dt> <dd>The name of the transcript</dd>
         *      <dt>Participant</dt> <dd>The name of the participant</dd>
         *      <dt>Corpus</dt> <dd>The name of corpus the transcript belongs to</dd>
         *      <dt>Line</dt> <dd>The start offset of the utterance, usually in seconds</dd>
         *      <dt>LineEnd</dt> <dd>The end offset of the uttereance, usually in seconds</dd>
         *      <dt>BeforeMatch</dt> <dd>The context of the trascript text just before the
         *       match</dd> 
         *      <dt>Transcript</dt> <dd>The transcript text that matched</dd>
         *      <dt>BeforeMatch</dt> <dd>The context of the transcript text just after
         *       the match</dd> 
         *    </dl>
         *   </dd> 
         * </dl>
         */
        getMatches(threadId, wordsContext, pageLength, pageNumber, onResult) {
            if (typeof wordsContext === "function") { // (threadId, onResult)
                onResult = wordsContext;
                wordsContext = null;
            }
            else if (typeof pageLength === "function") { // (threadId, wordsContext, onResult)
                onResult = pageLength;
                pageLength = null;
                pageNumber = null;
            }
            else if (typeof pageNumber === "function") {
                // (threadId, pageLength, pageNumber, onResult)
                onResult = pageNumber;
                pageNumber = pageLength;
                pageLength = wordsContext;
                wordsContext = null;
            }
            if (exports.verbose) {
                console.log("getMatches("+threadId+", "+wordsContext
                            +", "+pageLength+", "+pageNumber+")");
            }
            wordsContext = wordsContext || 0;
            
            this.createRequest("getMatches", {
                threadId : threadId,
                words_context : wordsContext,
                pageLength : pageLength,
                pageNumber : pageNumber
            }, onResult, this.baseUrl+"resultsStream").send();
        }
        
        /**
         * Gets annotations on selected layers related to search results returned by a previous
         * call to {@link Labbcat#getMatches}.
         * @param {string[]|object[]} matchIds A list of MatchIds, or a list of match
         * objects returned by {@link Labbcat#getMatches} 
         * @param {string[]} layerIds A list of layer IDs.
         * @param {int} [targetOffset=0] The distance from the original target of the match, e.g.
         * <ul>
         *  <li>0 - find annotations of the match target itself</li>
         *  <li>1 - find annotations of the token immediately <em>after</em> match target</li>
         *  <li>-1 - find annotations of the token immediately <em>before</em> match target</li>
         * </ul>
         * @param {int} [annotationsPerLayer=1] The number of annotations on the given layer to
         * retrieve. In most cases, there's only one annotation available. However, tokens may,
         * for example, be annotated with `all possible phonemic transcriptions', in which case
         * using a value of greater than 1 for this parameter provides other phonemic
         * transcriptions, for tokens that have more than one.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: An array of arrays of Annotations, of
         * dimensions <var>matchIds</var>.length &times; (<var>layerIds</var>.length *
         * <var>annotationsPerLayer</var>). The first index matches the corresponding
         * index in <var>matchIds</var>. 
         */
        getMatchAnnotations(matchIds, layerIds, targetOffset, annotationsPerLayer, onResult) {
            if (typeof targetOffset === "function") { // (matchIds, layerIds, onResult)
                onResult = targetOffset;
                targetOffset = null;
                annotationsPerLayer = null;
            } else if (typeof annotationsPerLayer === "function") {
                // (matchIds, layerIds, targetOffset, onResult)
                onResult = annotationsPerLayer;
                annotationsPerLayer = null;
            }

            // check that an array of matches hasn't been passed.
            if (typeof matchIds[0] != "string" && matchIds[0].MatchId) {
                // convert the array of matches into an array of MatchIds
                matchIds = matchIds.map(match => match.MatchId);
            }
            
            if (exports.verbose) {
                console.log("getMatchAnnotations("+JSON.stringify(matchIds)+", "
                            +JSON.stringify(layerIds)+", "+targetOffset+", "
                            +annotationsPerLayer+")");
            }
            targetOffset = targetOffset || 0;
            annotationsPerLayer = annotationsPerLayer || 1;

            // create form
            var fd = new FormData();
            fd.append("targetOffset", targetOffset);
            fd.append("annotationsPerLayer", annotationsPerLayer);
            fd.append("csvFieldDelimiter", ",");
            fd.append("targetColumn", "0");
            fd.append("copyColumns", "false");
            for (let layerId of layerIds ) fd.append("layer", layerId);

            // getMatchAnnotations expects an uploaded CSV file for MatchIds, 
            const uploadfile = "MatchId\n"+matchIds.join("\n");
            fd.append("uploadfile", uploadfile, {
                filename: 'uploadfile.csv',
                contentType: 'text/csv',
                knownLength: uploadfile.length
            });

            if (!runningOnNode) {	
	        // create HTTP request
	        var xhr = new XMLHttpRequest();
	        xhr.call = "getMatchAnnotations";
	        xhr.id = transcript.name;
	        xhr.onResult = onResult;
	        xhr.addEventListener("load", callComplete, false);
	        xhr.addEventListener("error", callFailed, false);
	        xhr.addEventListener("abort", callCancelled, false);	        
	        xhr.open("POST", this.baseUrl + "api/getMatchAnnotations");
	        if (this.username) {
	            xhr.setRequestHeader("Authorization", "Basic " + btoa(this.username + ":" + this.password))
	        }
	        xhr.setRequestHeader("Accept", "application/json");
	        xhr.send(fd);
            } else { // runningOnNode
	        var urlParts = parseUrl(this.baseUrl + "api/getMatchAnnotations");
	        // for tomcat 8, we need to explicitly send the content-type and content-length headers...
	        var labbcat = this;
                var password = this._password;
	        fd.getLength(function(something, contentLength) {
	            var requestParameters = {
		        port: urlParts.port,
		        path: urlParts.pathname,
		        host: urlParts.hostname,
		        headers: {
		            "Accept" : "application/json",
		            "content-length" : contentLength,
		            "Content-Type" : "multipart/form-data; boundary=" + fd.getBoundary()
		        }
	            };
	            if (labbcat.username && password) {
		        requestParameters.auth = labbcat.username+':'+password;
	            }
	            if (/^https.*/.test(labbcat.baseUrl)) {
		        requestParameters.protocol = "https:";
	            }
                    if (exports.verbose) {
                        console.log("submit: " + labbcat.baseUrl + "edit/transcript/new");
                    }
	            fd.submit(requestParameters, function(err, res) {
		        var responseText = "";
		        if (!err) {
		            res.on('data',function(buffer) {
			        //console.log('data ' + buffer);
			        responseText += buffer;
		            });
		            res.on('end',function(){
                                if (exports.verbose) console.log("response: " + responseText);
	                        var result = null;
	                        var errors = null;
	                        var messages = null;
			        try {
			            var response = JSON.parse(responseText);
			            result = response.model.result || response.model;
			            errors = response.errors;
			            if (errors.length == 0) errors = null
			            messages = response.messages;
			            if (messages.length == 0) messages = null
			        } catch(exception) {
			            result = null
                                    errors = ["" +exception+ ": " + labbcat.responseText];
                                    messages = [];
			        }
			        onResult(result, errors, messages, "getMatchAnnotations");
		            });
		        } else {
		            onResult(null, ["" +err+ ": " + labbcat.responseText], [], "getMatchAnnotations");
		        }
		        
		        if (res) res.resume();
	            });
	        }); // got length
            } // runningOnNode
        }
        
        /**
         * Downloads WAV sound fragments.
         * <p>For convenience, the first three arguments, <var>transcriptIds</var>, 
         * <var>startOffsets</var>, and <var>endOffsets</var>, can be replaced by a single
         * array of match objects of the kind returned by {@link Labbcat#getMatches}, in
         * which case the start/end times are the utterance boundaries - e.g.
         * <pre>labbcat.getMatches(threadId, wordsContext (result, e, m) => {
         *   labbcat.getMatchAnnotations(result.matches, sampleRate, dir, (files, e, m) => {
         *       ...
         *   });
         * });</pre>
         * @param {string[]} transcriptIds A list of transcript IDs (transcript names).
         * @param {float[]} startOffsets A list of start offsets, with one element for each
         * element in <var>transcriptIds</var>. 
         * @param {float[]} endOffsets A list of end offsets, with one element for each element in
         * <var>transcriptIds</var>. 
         * @param {int} [sampleRate] The desired sample rate, or null for no preference.
         * @param {string} [dir] A directory in which the files should be stored, or null
         * for a temporary folder.  If specified, and the directory doesn't exist, it will
         * be created.  
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: A list of WAV files. If <var>dir</var> is
         * null, these files will be stored under the system's temporary directory, so
         * once processing is finished, they should be deleted by the caller, or moved to
         * a more permanent location.  
         */
        getSoundFragments(transcriptIds, startOffsets, endOffsets, sampleRate, dir, onResult) {
            if (!runningOnNode) {
                onResult && onResult(
                    null, ["getSoundFragments is not yet implemented for browsers"], [], // TODO
                    "getSoundFragments");
                return;
            }
            
            // ensure transcriptIds is a list of strings, not a list of matches
            if (typeof transcriptIds[0] != "string" && transcriptIds[0].Transcript) {
                // convert the array of matches into an arrays of transcriptIds, startOffset,
                // and endOffsets...

                // shift remaining arguments to the right
                onResult = sampleRate
                dir = endOffsets
                sampleRate = startOffsets

                // create arrays
                startOffsets = transcriptIds.map(match => match.Line);
                endOffsets = transcriptIds.map(match => match.LineEnd);
                transcriptIds = transcriptIds.map(match => match.Transcript);
            }            

            if (transcriptIds.length != startOffsets.length || transcriptIds.length != endOffsets.length) {
                onResult && onResult(null, [
                    "transcriptIds ("+transcriptIds.length +"), startOffsets ("+startOffsets.length
                        +"), and endOffsets ("+endOffsets.length+") must be arrays of equal size."],
                                     [], "getSoundFragments");
                return;
            }

            if (typeof sampleRate === "function") {
                // (transcriptIds, startOffsets, endOffsets, onResult)
                onResult = sampleRate;
                sampleRate = null;
                dir = null;
            } else if (typeof dir === "function") {
                onResult = dir;
                if (typeof sampleRate === "string") {
                    // (transcriptIds, startOffsets, endOffsets, dir, onResult)
                    dir = sampleRate;
                    sampleRate = null;
                } else {
                    // (transcriptIds, startOffsets, endOffsets, sampleRate, onResult)
                    dir = null;
                }
            }
            if (exports.verbose) {
                console.log("getSoundFragments("+transcriptIds.length+" transcriptIds, "
                            +startOffsets.length+" startOffsets, "
                            +endOffsets.length+" endOffsets, "
                            +sampleRate+", "+dir+")");
            }

            if (dir == null) {
                dir = os.tmpdir();
            } else {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            }
            
            let fragments = [];
            let errors = [];
            
            // get fragments individually to ensure elements in result map 1:1 to element
            // in transcriptIds
	    const url = this.baseUrl + "soundfragment";
            const lc = this;
            const nextFragment = function(i) {
                if (i < transcriptIds.length) { // next file
	            const xhr = new XMLHttpRequest();
                    
	            let queryString = "?id="+encodeURIComponent(transcriptIds[i])
                        +"&start="+encodeURIComponent(startOffsets[i])
                        +"&end="+encodeURIComponent(endOffsets[i]);
                    if (sampleRate) queryString += "&sampleRate="+sampleRate;
                    
                    if (exports.verbose) {
                        console.log("GET: "+url + queryString + " as " + lc.username);
                    }
	            xhr.open("GET", url + queryString, true);
	            if (lc.username) {
	                xhr.setRequestHeader(
                            "Authorization", "Basic " + btoa(lc.username + ":" + lc._password))
 	            }
                    
	            xhr.setRequestHeader("Accept", "audio/wav");
                    // we want binary data, not text
                    xhr.responseType = "arraybuffer";
                    
	            xhr.addEventListener("error", function(evt) {
                        if (exports.verbose) {
                            console.log("getSoundFragments "+i+" ERROR: "+this.responseText);
                        }
                        errors.push("Could not get fragment "+i+": "+this.responseText);
                        fragments.push(null); // add a blank element
                        nextFragment(i+1);
                    }, false);
                    
	            xhr.addEventListener("load", function(evt) {
                        if (exports.verbose) {
                            console.log("getSoundFragments "+i+" loaded.");
                        }
                        // save the result to a file
                        let fileName = transcriptIds[i]+"__"+startOffsets[i]+"-"+endOffsets[i]+".wav";
                        let contentDisposition = this.getResponseHeader("content-disposition");
                        if (contentDisposition != null) {
                            // something like attachment; filename=blah.wav
                            const equals = contentDisposition.indexOf("=");
                            if (equals > 0) {
                                fileName = contentDisposition.substring(equals + 1);
                            }
                        }
                        const filePath = path.join(dir, fileName);
                        fs.writeFile(filePath, new Buffer(this.response), function(err) {
                            if (err) {
                                if (exports.verbose) {
                                    console.log("getSoundFragments "+i+" SAVE ERROR: "+err);
                                }
                                errors.push("Could not save fragment "+i+": "+err);
                            }
                            // add the file name to the result
                            if (exports.verbose) console.log("wrote file " + filePath);
                            fragments.push(filePath); // add a blank element
                            nextFragment(i+1);
                        });
                    }, false);
                    
                    xhr.send();
                } else { // there are no more triples
                    if (onResult) {
                        onResult(fragments, errors.length?errors:null, [], "getSoundFragments");
                    }
                }
            }
            nextFragment(0);
        }
        
        /**
         * Get transcript fragments in a specified format.
         * <p>For convenience, the first three arguments, <var>transcriptIds</var>, 
         * <var>startOffsets</var>, and <var>endOffsets</var>, can be replaced by a single
         * array of match objects of the kind returned by {@link Labbcat#getMatches}, in
         * which case the start/end times are the utterance boundaries - e.g.
         * <pre>labbcat.getMatches(threadId, wordsContext (result, e, m) => {
         *   labbcat.getFragments(result.matches, layerIds, mimeType, dir, (files, e, m) => {
         *       ...
         *   });
         * });</pre>
         * @param {string[]} transcriptIds A list of transcript IDs (transcript names).
         * @param {float[]} startOffsets A list of start offsets, with one element for
         * each element in <var>transcriptIds</var>. 
         * @param {float[]} endOffsets A list of end offsets, with one element for each element in
         * <var>transcriptIds</var>. 
         * @param {string[]} layerIds A list of IDs of annotation layers to include in the
         * fragment. 
         * @param {string} mimeType The desired format, for example "text/praat-textgrid" for Praat
         * TextGrids, "text/plain" for plain text, etc.
         * @param {string} [dir] A directory in which the files should be stored, or null
         * for a temporary folder.   If specified, and the directory doesn't exist, it will
         * be created.  
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be:  A list of files. If <var>dir</var> is null,
         * these files will be stored under the system's temporary directory, so once
         * processing is finished, they should be deleted by the caller, or moved to a
         * more permanent location. 
         */
        getFragments(transcriptIds, startOffsets, endOffsets, layerIds, mimeType, dir, onResult) {
            if (!runningOnNode) {
                onResult && onResult(
                    null, ["getFragments is not yet implemented for browsers"], [], // TODO
                    "getFragments");
                return;
            }
                
            // ensure transcriptIds is a list of strings, not a list of matches
            if (typeof transcriptIds[0] != "string" && transcriptIds[0].Transcript) {
                // convert the array of matches into an arrays of transcriptIds, startOffset,
                // and endOffsets...

                // shift remaining arguments to the right
                onResult = mimeType
                dir = layerIds
                mimeType = endOffsets
                layerIds = startOffsets

                // create arrays
                startOffsets = transcriptIds.map(match => match.Line);
                endOffsets = transcriptIds.map(match => match.LineEnd);
                transcriptIds = transcriptIds.map(match => match.Transcript);
            }
            
            if (transcriptIds.length != startOffsets.length || transcriptIds.length != endOffsets.length) {
                onResult && onResult(
                    null,
                    ["transcriptIds ("+transcriptIds.length +"), startOffsets ("+startOffsets.length
                     +"), and endOffsets ("+endOffsets.length+") must be arrays of equal size."],
                    [], "getFragments");
                return;
            }

            if (typeof dir === "function") {
                // (transcriptIds, startOffsets, endOffsets, layerIds, mimeType, onResult)
                onResult = dir;
                dir = null;
            }
            if (exports.verbose) {
                console.log("getFragments("+transcriptIds.length+" transcriptIds, "
                            +startOffsets.length+" startOffsets, "
                            +endOffsets.length+" endOffsets, "
                            +JSON.stringify(layerIds)+", "+mimeType+", "+dir+")");
            }
            
            if (dir == null) {
                dir = os.tmpdir();
            } else {
                if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            }
            
            let fragments = [];
            let errors = [];
            
            // get fragments individually to ensure elements in result map 1:1 to element
            // in transcriptIds
	    let url = this.baseUrl + "convertfragment?mimeType="+encodeURIComponent(mimeType);
            for (let layerId of layerIds) url += "&layerId=" + layerId;
            const lc = this;
            const nextFragment = function(i) {
                if (i < transcriptIds.length) { // next file
	            const xhr = new XMLHttpRequest();
                    
	            let queryString = "&id="+encodeURIComponent(transcriptIds[i])
                        +"&start="+encodeURIComponent(startOffsets[i])
                        +"&end="+encodeURIComponent(endOffsets[i]);
                    
                    if (exports.verbose) {
                        console.log("GET: "+url + queryString + " as " + lc.username);
                    }
	            xhr.open("GET", url + queryString, true);
	            if (lc.username) {
	                xhr.setRequestHeader(
                            "Authorization", "Basic " + btoa(lc.username + ":" + lc._password))
 	            }
                    
	            xhr.setRequestHeader("Accept", mimeType);
                    // we want binary data, not text
                    xhr.responseType = "arraybuffer";
                    
	            xhr.addEventListener("error", function(evt) {
                        if (exports.verbose) {
                            console.log("getFragments "+i+" ERROR: "+this.responseText);
                        }
                        errors.push("Could not get fragment "+i+": "+this.responseText);
                        fragments.push(null); // add a blank element
                        nextFragment(i+1);
                    }, false);
                    
	            xhr.addEventListener("load", function(evt) {
                        if (exports.verbose) {
                            console.log("getSoundFragments "+i+" loaded.");
                        }
                        // save the result to a file
                        let fileName = transcriptIds[i]+"__"+startOffsets[i]+"-"+endOffsets[i];
                        let contentDisposition = this.getResponseHeader("content-disposition");
                        if (contentDisposition != null) {
                            // something like attachment; filename=blah.wav
                            const equals = contentDisposition.indexOf("=");
                            if (equals > 0) {
                                fileName = contentDisposition.substring(equals + 1);
                            }
                        }
                        const filePath = path.join(dir, fileName);
                        fs.writeFile(filePath, new Buffer(this.response), function(err) {
                            if (err) {
                                if (exports.verbose) {
                                    console.log("getFragments "+i+" SAVE ERROR: "+err);
                                }
                                errors.push("Could not save fragment "+i+": "+err);
                            }
                            // add the file name to the result
                            fragments.push(filePath); // add a blank element
                            nextFragment(i+1);
                        });
                    }, false);
                    
                    xhr.send();
                } else { // there are no more triples
                    if (onResult) {
                        onResult(fragments, errors.length?errors:null, [], "getSoundFragments");
                    }
                }
            }
            nextFragment(0);
        }

        /**
         * Gets transcript attribute values for given transcript IDs.
         * @param {string[]} transcriptIds A list of transcript IDs (transcript names).
         * @param {string[]} layerIds A list of layer IDs corresponding to transcript
         * attributes. In general, these are layers whose ID is prefixed 'transcript_',
         * however formally it's any layer where layer.parentId == 'graph' &&
         * layer.alignment == 0, which includes 'corpus' as well as transcript attribute layers.
         * @param {string} fileName The full path for the file where the results CSV
         * should be saved. 
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: The CSV file path - i.e. <var>fileName</var>
         * or null if the request failed.  
         */
        getTranscriptAttributes(transcriptIds, layerIds, fileName, onResult) {
            if (!runningOnNode) {
                onResult && onResult(
                    null, ["getTranscriptAttributes is not yet implemented for browsers"], [], // TODO
                    "getTranscriptAttributes");
                return;
            }
            if (exports.verbose) {
                console.log("getTranscriptAttributes("+transcriptIds.length+" transcriptIds, "
                            +JSON.stringify(layerIds)+")");
            }
	    const xhr = new XMLHttpRequest();            
            const url = this.baseUrl + "transcripts";            
	    let queryString = "?todo=export&exportType=csv&layer=graph";
            for (let id of layerIds) queryString += "&layer="+encodeURIComponent(id);
            for (let id of transcriptIds) queryString += "&id="+encodeURIComponent(id);
            if (exports.verbose) {
                console.log("GET: "+url + queryString + " as " + this.username);
            }
	    xhr.open("GET", url + queryString, true);
	    if (this.username) {
	        xhr.setRequestHeader(
                    "Authorization", "Basic " + btoa(this.username + ":" + this._password))
 	    }
	    xhr.setRequestHeader("Accept", "text/csv");

            xhr.addEventListener("error", function(evt) {
                if (exports.verbose) {
                    console.log("getTranscriptAttributes "+i+" ERROR: "+this.responseText);
                }
                fragments.push(null); // add a blank element
                if (onResult) {
                    onResult(null, ["Could not get transcript attributes: "
                                    +this.responseText], [], "getTranscriptAttributes");
                }
            }, false);
            
	    xhr.addEventListener("load", function(evt) {
                if (exports.verbose) {
                    console.log("getTranscriptAttributes loaded. " + JSON.stringify(this.response));
                }
                fs.writeFile(fileName, new Buffer(xhr.responseText), function(err) {
                    if (exports.verbose) {
                        console.log("getTranscriptAttributes wrote file " + fileName);
                    }
                    let errors = null;
                    if (err) {
                        if (exports.verbose) {
                            console.log("getTranscriptAttributes SAVE ERROR: "+err);
                        }
                        errors = ["Could not get transcript attributes: "+err];
                    }
                    onResult(fileName, errors, [], "getTranscriptAttributes");
                });
            }, false);
            
            xhr.send();
        }
        
        /**
         * Gets participant attribute values for given participant IDs.
         * @param {string[]} participantIds A list of participant IDs.
         * @param {string[]} layerIds A list of layer IDs corresponding to participant
         * attributes. In general, these are layers whose ID is prefixed 'participant_',
         * however formally it's any layer where layer.parentId == 'participant' &&
         * layer.alignment == 0.
         * @param {string} fileName The full path for the file where the results CSV
         * should be saved. 
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: The CSV file path - i.e. <var>fileName</var>
         * or null if the request failed.  
         */
        getParticipantAttributes(participantIds, layerIds, fileName, onResult) {
            if (!runningOnNode) {
                onResult && onResult(
                    null, ["getParticipantAttributes is not yet implemented for browsers"], [], // TODO
                    "getParticipantAttributes");
                return;
            }
            if (exports.verbose) {
                console.log("getParticipantAttributes("+participantIds.length+" participantIds, "
                            +JSON.stringify(layerIds)+")");
            }
	    const xhr = new XMLHttpRequest();            
            const url = this.baseUrl + "participantsExport";            
	    let queryString = "?type=participant&content-type=text/csv&csvFieldDelimiter=,";
            for (let id of layerIds) queryString += "&layer="+encodeURIComponent(id);
            for (let id of participantIds) queryString += "&participantId="+encodeURIComponent(id);
            if (exports.verbose) {
                console.log("GET: "+url + queryString + " as " + this.username);
            }
	    xhr.open("GET", url + queryString, true);
	    if (this.username) {
	        xhr.setRequestHeader(
                    "Authorization", "Basic " + btoa(this.username + ":" + this._password))
 	    }
	    xhr.setRequestHeader("Accept", "text/csv");

            xhr.addEventListener("error", function(evt) {
                if (exports.verbose) {
                    console.log("getParticipantAttributes "+i+" ERROR: "+this.responseText);
                }
                fragments.push(null); // add a blank element
                if (onResult) {
                    onResult(null, ["Could not get participant attributes: "
                                    +this.responseText], [], "getParticipantAttributes");
                }
            }, false);
            
	    xhr.addEventListener("load", function(evt) {
                if (exports.verbose) {
                    console.log("getParticipantAttributes loaded. " + JSON.stringify(this.response));
                }
                fs.writeFile(fileName, new Buffer(xhr.responseText), function(err) {
                    if (exports.verbose) {
                        console.log("getParticipantAttributes wrote file " + fileName);
                    }
                    let errors = null;
                    if (err) {
                        if (exports.verbose) {
                            console.log("getParticipantAttributes SAVE ERROR: "+err);
                        }
                        errors = ["Could not get participant attributes: "+err];
                    }
                    onResult(fileName, errors, [], "getParticipantAttributes");
                });
            }, false);
            
            xhr.send();
        }
        
    } // class LabbcatView

    // LabbcatEdit class - read/write "edit" access

    /**
     * Read/write interaction with LaBB-CAT corpora, based on the  
     * <a href="https://nzilbb.github.io/ag/javadoc/nzilbb/ag/IGraphStore.html">nzilbb.ag.IGraphStore</a>.
     * interface.
     * <p>This class inherits the <em>read-only</em> operations of LabbcatView
     * and adds some <em>write</em> operations for updating data.
     * @example
     * // create annotation store client
     * const store = new LabbcatEdit("https://labbcat.canterbury.ac.nz", "demo", "demo");
     * // get a corpus
     * store.getCorpusIds((corpora, errors, messages, call)=>{ 
     *     console.log("transcripts in: " + corpora[0]); 
     *     store.getTranscriptIdsInCorpus(corpora[0], (ids, errors, messages, call, id)=>{ 
     *         console.log("Deleting all transcripts in " + id));
     *         for (i in ids) {
     *           store.deleteTranscript(ids[i], (ids, errors, messages, call, id)=>{ 
     *               console.log("deleted " + id);
     *             });
     *         }
     *       });
     *   });
     * @extends LabbcatView
     * @author Robert Fromont robert@fromont.net.nz
     */
    class LabbcatEdit extends LabbcatView{
        
        /**
         * The graph store URL - e.g. https://labbcat.canterbury.ac.nz/demo/api/edit/store/
         */
        get storeEditUrl() {
            return this._storeEditUrl;
        }
        /** 
         * Create a store client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link)
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            super(baseUrl, username, password);
            this._storeEditUrl = this.baseUrl + "api/edit/store/";
        }

        /**
         * Saves the given transcript. The graph can be partial e.g. include only some of
         * the layers that the stored version of the transcript contains.
         * @param graph The transcript to save.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: true if changes were saved, false if there
         * were no changes to save.
         */
        saveGraph(graph, onResult) { // TODO
        }
    
        /**
         * Saves the given media for the given transcript
         * @param {string} id The transcript ID
         * @param {string} trackSuffix The track suffix of the media.
         * @param {string} mediaUrl A URL to the media content.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveMedia(id, trackSuffix, mediaUrl, onResult) { // TODO
        }
        
        /**
         * Saves the given source file (transcript) for the given transcript.
         * @param {string} id The transcript ID
         * @param {string} url A URL to the transcript.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveSource(id, url, onResult) { // TODO
        }

        /**
         * Saves the given document for the episode of the given transcript.
         * @param {string} id The transcript ID
         * @param {string} url A URL to the document.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveEpisodeDocument(id, url, onResult) { // TODO
        }
        
        /**
         * Deletes the given transcript, and all assciated media, from the graph store.
         * @param {string} id The transcript ID
         * @param {resultCallback} onResult Invoked when the request has completed.
         */
        deleteTranscript(id, onResult) {
	    this.createRequest("deleteTranscript", {id : id}, onResult, null, "POST", this.storeEditUrl).send();
        }

        /**
         * Uploads a new transcript.
         * @param {file|string} transcript The transcript to upload. In a browser, this
         * must be a file object, and in Node, it must be the full path to the file. 
         * @param {file|file[]|string|string[]} media The media to upload, if any. In a
         * browser, these must be file objects, and in Node, they must be the full paths
         * to the files.
         * @param {string} [mediaSuffix] The media suffix for the media.
         * @param {string} transcriptType The transcript type.
         * @param {string} corpus The corpus for the transcript.
         * @param {string} [episode] The episode the transcript belongs to.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * result, which is the task ID of the resulting annotation generation task. The
         * task status can be updated using {@link Labbcat#taskStatus} 
         * @param onProgress Invoked on XMLHttpRequest progress.
         */
        newTranscript(transcript, media, mediaSuffix, transcriptType, corpus, episode, onResult, onProgress) {
            if (typeof corpus === "function") {
                // (transcript, media, transcriptType, corpus, onResult, onProgress)
                onProgress = episode;
                onResult = corpus;
                episode = null;
                corpus = transcriptType;
                transcriptType = mediaSuffix;
                mediaSuffix = null;
            } else if (typeof episode === "function") {
                // (transcript, media, transcriptType, corpus, episode, onResult, onProgress)
                onProgress = onResult;
                onResult = episode;
                episode = corpus;
                corpus= transcriptType;
                transcriptType = mediaSuffix;
                mediaSuffix = null;
            }
            if (exports.verbose) {
                console.log("newTranscript(" + transcript + ", " + media + ", " + mediaSuffix
                            + ", " + transcriptType + ", " + corpus + ", " + episode + ")");
            }
            // create form
            var fd = new FormData();
            fd.append("todo", "new");
            fd.append("auto", "true");
            if (transcriptType) fd.append("transcript_type", transcriptType);
            if (corpus) fd.append("corpus", corpus);
            if (episode) fd.append("episode", episode);
            
            if (!runningOnNode) {	
                
	        fd.append("uploadfile1_0", transcript);
	        if (media) {
	            if (!mediaSuffix) mediaSuffix = "";
	            if (media.constructor === Array) { // multiple files
		        for (var f in media) {
		            fd.append("uploadmedia"+mediaSuffix+"1", media[f]);
		        } // next file
                    } else { // a single file
		        fd.append("uploadmedia"+mediaSuffix+"1", media);
	            }
	        }
                
	        // create HTTP request
	        var xhr = new XMLHttpRequest();
	        xhr.call = "newTranscript";
	        xhr.id = transcript.name;
	        xhr.onResult = onResult;
	        xhr.addEventListener("load", callComplete, false);
	        xhr.addEventListener("error", callFailed, false);
	        xhr.addEventListener("abort", callCancelled, false);
	        xhr.upload.addEventListener("progress", onProgress, false);
	        xhr.upload.id = transcript.name; // for knowing what status to update during events
	        
	        xhr.open("POST", this.baseUrl + "edit/transcript/new");
	        if (this.username) {
	            xhr.setRequestHeader("Authorization", "Basic " + btoa(this.username + ":" + this.password))
	        }
	        xhr.setRequestHeader("Accept", "application/json");
	        xhr.send(fd);
            } else { // runningOnNode
	        
	        // on node.js, files are actually paths
	        var transcriptName = transcript.replace(/.*\//g, "");
                if (exports.verbose) console.log("transcriptName: " + transcriptName);

	        fd.append("uploadfile1_0", 
		          fs.createReadStream(transcript).on('error', function(){
		              onResult(null, ["Invalid transcript: " + transcriptName], [], "newTranscript", transcriptName);
		          }), transcriptName);
                
	        if (media) {
	            if (!mediaSuffix) mediaSuffix = "";
	            if (media.constructor === Array) { // multiple files
		        for (var f in media) {
		            var mediaName = media[f].replace(/.*\//g, "");
		            try {
			        fd.append("uploadmedia"+mediaSuffix+(f+1), 
				          fs.createReadStream(media[f]).on('error', function(){
				              onResult(null, ["Invalid media: " + mediaName], [], "newTranscript", transcriptName);
				          }), mediaName);
		            } catch(error) {
			        onResult(null, ["Invalid media: " + mediaName], [], "newTranscript", transcriptName);
			        return;
		            }
		        } // next file
                    } else { // a single file
		        var mediaName = media.replace(/.*\//g, "");
		        fd.append("uploadmedia"+mediaSuffix+"1", 
			          fs.createReadStream(media).on('error', function(){
			              onResult(null, ["Invalid media: " + mediaName], [], "newTranscript", transcriptName);
			          }), mediaName);
	            }
	        }
	        
	        var urlParts = parseUrl(this.baseUrl + "edit/transcript/new");
	        // for tomcat 8, we need to explicitly send the content-type and content-length headers...
	        var labbcat = this;
                var password = this._password;
	        fd.getLength(function(something, contentLength) {
	            var requestParameters = {
		        port: urlParts.port,
		        path: urlParts.pathname,
		        host: urlParts.hostname,
		        headers: {
		            "Accept" : "application/json",
		            "content-length" : contentLength,
		            "Content-Type" : "multipart/form-data; boundary=" + fd.getBoundary()
		        }
	            };
	            if (labbcat.username && password) {
		        requestParameters.auth = labbcat.username+':'+password;
	            }
	            if (/^https.*/.test(labbcat.baseUrl)) {
		        requestParameters.protocol = "https:";
	            }
                    if (exports.verbose) {
                        console.log("submit: " + labbcat.baseUrl + "edit/transcript/new");
                    }
	            fd.submit(requestParameters, function(err, res) {
		        var responseText = "";
		        if (!err) {
		            res.on('data',function(buffer) {
			        //console.log('data ' + buffer);
			        responseText += buffer;
		            });
		            res.on('end',function(){
                                if (exports.verbose) console.log("response: " + responseText);
	                        var result = null;
	                        var errors = null;
	                        var messages = null;
			        try {
			            var response = JSON.parse(responseText);
			            result = response.model.result || response.model;
			            errors = response.errors;
			            if (errors.length == 0) errors = null
			            messages = response.messages;
			            if (messages.length == 0) messages = null
			        } catch(exception) {
			            result = null
                                    errors = ["" +exception+ ": " + labbcat.responseText];
                                    messages = [];
			        }
                                // for this call, the result is an object with one key, whose
                                // value is the threadId - so just return that
			        onResult(result[transcriptName], errors, messages, "newTranscript",
                                         transcriptName);
		            });
		        } else {
		            onResult(null, ["" +err+ ": " + labbcat.responseText], [], "newTranscript", transcriptName);
		        }
		        
		        if (res) res.resume();
	            });
	        }); // got length
            } // runningOnNode
        }
        
        /**
         * Uploads a new version of an existing transcript.
         * @param {file|string} transcript The transcript to upload. In a browser, this
         * must be a file object, and in Node, it must be the full path to the file. 
         * @param {resultCallback} onResult Invoked when the request has returned a result, 
         * which is the task ID of the resulting annotation generation task. The 
         * task status can be updated using {@link Labbcat#taskStatus}
         * @param onProgress Invoked on XMLHttpRequest progress.
         */
        updateTranscript(transcript, onResult, onProgress) {
            if (exports.verbose) console.log("updateTranscript(" + transcript + ")");
            
            // create form
            var fd = new FormData();
            fd.append("todo", "update");
            fd.append("auto", "true");
            
            if (!runningOnNode) {	
                
	        fd.append("uploadfile1_0", transcript);
                
	        // create HTTP request
	        var xhr = new XMLHttpRequest();
	        xhr.call = "updateTranscript";
	        xhr.id = transcript.name;
	        xhr.onResult = onResult;
	        xhr.addEventListener("load", callComplete, false);
	        xhr.addEventListener("error", callFailed, false);
	        xhr.addEventListener("abort", callCancelled, false);
	        xhr.upload.addEventListener("progress", onProgress, false);
	        xhr.upload.id = transcript.name; // for knowing what status to update during events
	        
	        xhr.open("POST", this.baseUrl + "edit/transcript/new");
	        if (this.username) {
	            xhr.setRequestHeader("Authorization", "Basic " + btoa(this.username + ":" + this._password))
	        }
	        xhr.setRequestHeader("Accept", "application/json");
	        xhr.send(fd);
            } else { // runningOnNode
	        
	        // on node.js, files are actually paths
	        var transcriptName = transcript.replace(/.*\//g, "");
	        fd.append("uploadfile1_0", 
		          fs.createReadStream(transcript).on('error', function(){
		              onResult(null, ["Invalid transcript: " + transcriptName], [], "updateTranscript", transcriptName);
		          }), transcriptName);
	        
	        var urlParts = parseUrl(this.baseUrl + "edit/transcript/new");
	        var requestParameters = {
	            port: urlParts.port,
	            path: urlParts.pathname,
	            host: urlParts.hostname,
	            headers: { "Accept" : "application/json" }
	        };
	        if (this.username && this._password) {
	            requestParameters.auth = this.username+':'+this._password;
	        }
	        if (/^https.*/.test(this.baseUrl)) {
	            requestParameters.protocol = "https:";
	        }
	        fd.submit(requestParameters, function(err, res) {
	            var responseText = "";
	            if (!err) {
		        res.on('data',function(buffer) {
		            //console.log('data ' + buffer);
		            responseText += buffer;
		        });
		        res.on('end',function(){
                            if (exports.verbose) console.log("response: " + responseText);
	                    var result = null;
	                    var errors = null;
	                    var messages = null;
		            try {
			        var response = JSON.parse(responseText);
			        result = response.model.result || response.model;
			        errors = response.errors;
			        if (errors.length == 0) errors = null
			        messages = response.messages;
			        if (messages.length == 0) messages = null
;
		            } catch(exception) {
			        result = null
                                errors = ["" +exception+ ": " + labbcat.responseText];
                                messages = [];
		            }
                            // for this call, the result is an object with one key, whose
                            // value is the threadId - so just return that
			    onResult(result[transcriptName], errors, messages, "updateTranscript",
                                     transcriptName);
                        });
	            } else {
		        onResult(null, ["" +err+ ": " + this.responseText], [], "updateTranscript", transcriptName);
	            }
                    
	            if (res) res.resume();
	        });
            }
        }

    } // class LabbcatEdit
    
    // LabbcatAdmin class - read/write "admin" access

    /**
     * Read/write/administration interaction with LaBB-CAT corpora.
     * <p>This class inherits the <em>read/write</em> operations of LabbcatEdit
     * and adds some administration functions.
     * @example
     * // create annotation store client
     * const store = new labbcat.LabbcatAdmin("http://localhost:8080/labbcat", "labbcat", "labbcat");
     * // add a corpus
     * store.createCorpus("new-corpus", "en", "New English Corpus", (corpus, errors, messages, call)=>{ 
     *     console.log("new corpus ID is: " + corpus.corpus_id); 
     *     store.updateCorpus(corpus.corpus_id, "new-corpus", "de", "New German Corpus", (corpus, errors, messages, call)=>{ 
     *         console.log("corpus updated, language is now: " + corpus.corpus_language); 
     *         store.deleteCorpus(corpus.corpus_id, (result, errors, messages, call)=>{ 
     *             console.log("corpus deleted"); 
     *         });
     *       });
     *   });
     * store.readCorpora((corpora, errors, messages, call)=>{ 
     *     for (let corpus of corpora) {
     *       console.log("corpus: " + corpus.corpus_name); 
     *     } // next corpus
     *   });
     * @extends LabbcatView
     * @author Robert Fromont robert@fromont.net.nz
     */
    class LabbcatAdmin extends LabbcatEdit {
        
        /**
         * The graph store URL - e.g. https://labbcat.canterbury.ac.nz/demo/api/edit/store/
         */
        get storeAdminUrl() {
            return this._storeEditUrl;
        }
        /** 
         * Create a store client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link)
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            super(baseUrl, username, password);
            this._storeEditUrl = this.baseUrl + "api/admin/store/";
        }

        /**
         * Creates a new corpus record.
         * @param {string} corpus_name The name/ID of the corpus.
         * @param {string} corpus_language The ISO 639-1 code for the default language.
         * @param {string} corpus_description The description of the corpus.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: A copy of the corpus record, 
         * including <em> corpus_id </em> - The database key for the record. 
         */
        createCorpus(corpus_name, corpus_language, corpus_description, onResult) {
            this.createRequest(
                "corpora", null, onResult, this.baseUrl+"api/admin/corpora", "POST")
                .send(JSON.stringify({
                    corpus_name : corpus_name,
                    corpus_language : corpus_language,
                    corpus_description : corpus_description}));
        }
        
        /**
         * Reads a list of corpus records.
         * @param {int} [p] The zero-based  page of records to return (if null, all
         * records will be returned). 
         * @param {int} [l] The length of pages (if null, the default page length is 20).
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: A list of corpus records with the following
         * attributes:
         * <dl>
         *  <dt> corpus_id </dt> <dd> The database key for the record. </dd>
         *  <dt> corpus_name </dt> <dd> The name/id of the corpus. </dd>
         *  <dt> corpus_language </dt> <dd> The ISO 639-1 code for the default language. </dd>
         *  <dt> corpus_description </dt> <dd> The description of the corpus. </dd>
         *  <dt> _cantDelete </dt> <dd> This is not a database field, but rather is present in
         *    records returned from the server that can not currently be deleted; 
         *    a string representing the reason the record can't be deleted. </dd>
         * </dl>
         */
        readCorpora(p, l, onResult) {
            if (typeof p === "function") { // (onResult)
                onResult = p;
                p = null;
                l = null;
            } else if (typeof l === "function") { // (p, onResult)
                onResult = l;
                l = null;
            }
            this.createRequest("corpora", { p:p, l:l }, onResult, this.baseUrl+"api/admin/corpora")
                .send();
        }
        
        /**
         * Updates an existing corpus record.
         * @param {string} corpus_id The database key for the record. // TODO eliminate corpus_id
         * @param {string} corpus_name The name/ID of the corpus.
         * @param {string} corpus_language The ISO 639-1 code for the default language.
         * @param {string} corpus_description The description of the corpus.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be: A copy of the corpus record, 
         * including <em> corpus_id </em>; The database key for the record. 
         */
        updateCorpus(corpus_id, corpus_name, corpus_language, corpus_description, onResult) {
            this.createRequest(
                "corpora", null, onResult, this.baseUrl+"api/admin/corpora", "PUT")
                .send(JSON.stringify({
                    corpus_id : corpus_id,
                    corpus_name : corpus_name,
                    corpus_language : corpus_language,
                    corpus_description : corpus_description}));
        }
        
        /**
         * Deletes an existing corpus record.
         * @param {string} corpus_id The database key for the record. // TODO eliminate corpus_id
         * @param {resultCallback} onResult Invoked when the request has completed.
         */
        deleteCorpus(corpus_id, onResult) {
            this.createRequest(
                "corpora", null, onResult, this.baseUrl+"api/admin/corpora/"+ corpus_id, "DELETE")
                .send();
        }
    }
    
    /**
     * Interpreter for match ID strings.
     * <p>The schema is:</p>
     * <ul>
     * 	<li>
     * 		when there's a defining annotation UID:<br>
     * 		g_<i>ag_id</i>;<em>uid</em><br>
     * 		e.g. <tt>g_243;em_12_20035</tt></li>
     * 	<li>
     * 		when there's anchor IDs:<br>
     * 		g_<i>ag_id</i>;<em>startuid</em>-<em>enduid</em><br>
     * 		e.g. <tt>g_243;n_72700-n_72709</tt></li>
     * 	<li>
     * 		when there's anchor offsets:<br>
     * 		g_<i>ag_id</i>;<em>startoffset</em>-<em>endoffset</em><br>
     * 		e.g. <tt>g_243;39.400-46.279</tt></li>
     * 	<li>
     * 		when there's a participant/speaker number, it will be appended:<br>
     * 		<em>...</em>;p_<em>speakernumber</em><br>
     * 		e.g.&nbsp;<tt>g_243;n_72700-n_72709;p_76</tt></li>
     * 	<li>
     * 		matching subparts can be identified by appending a list of annotation UIDs for insertion into {@link #mMatchAnnotationUids}, the keys being enclosed in square brackets:<br>
     * 		...;<em>[key]=uid;[key]=uid</em><br>
     * 		e.g. <samp>g_243;n_72700-n_72709;[0,0]=ew_0_123;[1,0]ew_0_234</samp></li>
     * 	<li>
     * 		a target annotation by appending a uid prefixed by <samp>#=</samp>:<br>
     * 		...;#=<em>uid</em><br>
     * 		e.g. <samp>g_243;n_72700-n_72709;#=ew_0_123</samp></li>
     * 	<li>
     * 		other items (search name or prefix) could then come after all that, and key=value pairs:<br>
     * 		...;<em>key</em>=<em>value</em><br>
     * 		e.g.&nbsp;<tt>g_243;n_72700-n_72709;ew_0_123-ew_0_234;prefix=024-;name=the_aeiou</tt></li>
     * <p>These can be something like:
     * <ul>
     * <li><q>g_3;em_11_23;n_19985-n_20003;p_4;#=ew_0_12611;prefix=001-;[0]=ew_0_12611</q></li>
     * <li><q>AgnesShacklock-01.trs;60.897-67.922;prefix=001-</q></li>
     * <li><q>AgnesShacklock-01.trs;60.897-67.922;m_-1_23</q></li>
     * </ul>
     */
    class MatchId {
        /**
         * String constructor.
         */
        constructor(matchId) {
            this._transcriptId = null;
            this._startAnchorId = null;
            this._endAnchorId = null;
            this._startOffset = null;
            this._endOffset = null;
            this._utteranceId = null;
            this._participantId = null;
            this._targetId = null;
            this._prefix = null;
            if (matchId) {
                const parts = matchId.split(";");
                this._transcriptId = parts[0];
                let intervalPart = null;
                for (let part of parts) {
                    if (part == parts[0]) continue;
                    if (part.indexOf("-") > 0) {
                        intervalPart = part;
                        break;
                    }
                } // next part
                const interval = intervalPart.split("-");
                if (interval[0].startsWith("n_")) { // anchor IDs
                    this._startAnchorId = interval[0];
                    this._endAnchorId = interval[1];
                } else { // offsets
                    this._startOffset = parseFloat(interval[0]);
                    this._endOffset = parseFloat(interval[1]);
                }
                for (let part of parts) {
                    if (part.startsWith("prefix=")) {
                        this._prefix = part.substring("prefix=".length);
                    } else if (part.startsWith("em_") || part.startsWith("m_")) {
                        this._utteranceId = part;
                    } else if (part.startsWith("p_")) {
                        this._participantId = part;
                    } else if (part.startsWith("#=")) {
                        this._targetId = part.substring("#=".length);
                    }
                } // next part
            } // string was given
        }
        /**
         * The transcript identifier.
         */
        get transcriptId() { return this._transcriptId; }
        /**
         * ID of the start anchor.
         */
        get startAnchorId() { return this._startAnchorId; }
        /**
         * ID of the end anchor.
         */
        get endAnchorId() { return this._endAnchorId; }
        /**
         * Offset of the start anchor.
         */
        get startOffset() { return this._startOffset; }
        /**
         * Offset of the end anchor.
         */
        get endOffset() { return this._endOffset; }
        /**
         * ID of the participant.
         */
        get participantId() { return this._participantId; }
        /**
         * ID of the match utterance.
         */
        get utteranceId() { return this._utteranceId; }
        /**
         * ID of the match target annotation.
         */
        get targetId() { return this._targetId; }
        /**
         * Match prefix for fragments.
         */
        get prefix() { return this._prefix; }
    }
    
    exports.LabbcatView = LabbcatView;
    exports.LabbcatEdit = LabbcatEdit;
    exports.LabbcatAdmin = LabbcatAdmin;
    exports.MatchId = MatchId;
    exports.verbose = false;

}(typeof exports === 'undefined' ? this.labbcat = {} : exports));

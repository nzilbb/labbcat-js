/**
 * @file nzilbb.labbcat module for communicating with a LaBB-CAT web application.
 *
 * @example
 * var lc = new labbcat.Labbcat(baseUrl);
 * // load corpora
 * lc.getCorpusIds(function(result, errors, messages, call, id) {
 *     if (errors) {
 *        alert("Could not list corpora: " + errors[0]);
 *     } else {
 *       var corpora = document.getElementById("corpus");
 *       for (var i in result) {
 *         var option = document.createElement("option");
 *         option.appendChild(document.createTextNode(result[i]));
 *         if (result[i] == "${sessionScope['corpus']}") {
 *           option.selected = "selected";
 *         }
 *         corpora.appendChild(option);
 *       }
 *       
 *     }
 *   });
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
        btoa = require('btoa');
        parseUrl = require('url').parse;
        runningOnNode = true;
    }

    /**
     * Callback invoked when the result of a request is available.
     *
     * @callback resultCallback
     * @param result The result of the method
     * @param {string[]} errors The error, if any
     * @param {string[]} messages The error, if any
     * @param {string} call The method that was called
     * @param {string} id The ID that was passed to the method, if any.
     * @param {object} taskIds A list of IDs of the resulting server tasks, if any.
     */
    
    function callComplete(evt) {
        if (exports.verbose) console.log("callComplete: " + this.responseText);
        try {
	    var response = JSON.parse(this.responseText);
	    var result = null;
            if (response.model != null) {
                if (response.model.result) result = response.model.result;
	        if (!result && result != 0) result = response.model;
            }
            if (exports.verbose) console.log("result: " + result);
	    var errors = response.errors;
	    if (!errors || errors.length == 0) errors = null;
	    var messages = response.messages;
	    if (!messages || messages.length == 0) messages = null;
            if (exports.verbose) console.log("onResult: " + result + " " + evt.target.call + " " + evt.target.onResult);
	    evt.target.onResult(result, errors, messages, evt.target.call, evt.target.id);
        } catch(exception) {
	    evt.target.onResult(null, ["" +exception+ ": " + this.responseText], [], evt.target.call, evt.target.id);
        }
    }
    function callFailed(evt) {
        if (exports.verbose) console.log("callFailed: "+this.responseText);
        evt.target.onResult(null, ["failed: " + this.responseText], [], evt.target.call, evt.target.id);
    }
    function callCancelled(evt) {
        if (exports.verbose) console.log("callCancelled");
        evt.target.onResult(null, ["cancelled"], [], evt.target.call, evt.target.id);
    }

    // GraphStoreQuery class - read-only "view" access
    
    /**
     * Read-only querying of LaBB-CAT corpora, based on the  
     * <a href="https://nzilbb.github.io/ag/javadoc/nzilbb/ag/IGraphStoreQuery.html">nzilbb.ag.IGraphStoreQuery</a>
     * interface.
     * @example
     * // create annotation store client
     * const store = new GraphStoreQuery("https://labbcat.canterbury.ac.nz", "demo", "demo");
     * // get some basic information
     * store.getId((result, errors, messages, call)=>{ 
     *     console.log("id: " + result); 
     *   });
     * store.getLayerIds((layers, errors, messages, call)=>{ 
     *     for (l in result) console.log("layer: " + layers[l]); 
     *   });
     * store.getCorpusIds((corpora, errors, messages, call)=>{ 
     *     store.getGraphIdsInCorpus(corpora[0], (ids, errors, messages, call, id)=>{ 
     *         console.log("transcripts in: " + id); 
     *         for (i in ids) console.log(ids[i]);
     *       });
     *   });
     * @author Robert Fromont robert@fromont.net.nz
     */
    class GraphStoreQuery {
        /** 
         * Create a query client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link)
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            if (!/\/$/.test(baseUrl)) baseUrl += "/";
            this._baseUrl = baseUrl;
            this._storeUrl = baseUrl + "store/";
            
            this._username = username;
            this._password = password;
        }
        
        /**
         * The base URL - e.g. https://labbcat.canterbury.ac.nz/demo/store/
         */
        get baseUrl() {
            return this._baseUrl;
        }
        
        /**
         * The graph store URL - e.g. https://labbcat.canterbury.ac.nz/demo/store/
         */
        get storeUrl() {
            return this._storeUrl;
        }
        
        /**
         * The LaBB-CAT user name.
         */
        get username() {
            return this._username;
        }
        
        /**
         * Creates an http request.
         * @param {string} call The name of the API function to call
         * @param {object} parameters The arguments of the function, if any
         * @callback {resultCallback} onResult Invoked when the request has returned a result.
         * @return {XMLHttpRequest} An open request.
         */
        createRequest(call, parameters, onResult, url) {
            if (exports.verbose)  {
                console.log("createRequest "+url + " " + call + " " + JSON.stringify(parameters));
            }
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
	    if (!url) url = this.storeUrl;

            if (exports.verbose) {
                console.log("GET: "+url + call + queryString + " as " + this.username);
            }
	    xhr.open("GET", url + call + queryString, true);
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
         * <var>result</var> which will be:  {string[]} A list of participant IDs.
         */
        getParticipantIds(onResult) {
	    this.createRequest("getParticipantIds", null, onResult).send();
        }
        
        /**
         * Gets a list of graph IDs.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of graph IDs.
         */
        getGraphIds(onResult) {
	    this.createRequest("getGraphIds", null, onResult).send();
        }
        
        /**
         * Gets a list of graph IDs in the given corpus.
         * @param {string} id A corpus ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of graph IDs.
         */
        getGraphIdsInCorpus(id, onResult) {
	    this.createRequest("getGraphIdsInCorpus", { id : id }, onResult).send();
        }
        
        /**
         * Gets a list of IDs of graphs that include the given participant.
         * @param {string} id A participant ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  {string[]} A list of graph IDs.
         */
        getGraphIdsWithParticipant(id, onResult) {
	    this.createRequest("getGraphIdsWithParticipant", { id : id }, onResult).send();
        }
        
        /**
         * Gets a graph given its ID, containing only the given layers.
         * @param {string} id The given graph ID.
         * @param {string[]} layerId The IDs of the layers to load, or null for all
         * layers. If only graph data is required, set this to ["graph"]. 
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified graph.
         */
        getGraph (id, layerId, onResult) {
	    this.createRequest("getGraph", { id : id, layerId : layerId }, onResult).send();
        }
        
        /**
         * Gets the number of annotations on the given layer of the given graph.
         * @param {string} id The given graph ID.
         * @param {string} layerId The ID of the layer to load.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified graph.
         */
        countAnnotations (id, layerId, onResult) {
	    this.createRequest("countAnnotations", { id : id, layerId : layerId }, onResult).send();
        }
        
        /**
         * Gets the annotations on the given layer of the given graph.
         * @param {string} id The given graph ID.
         * @param {string} layerId The ID of the layer to load.
         * @param {int} pageLength The number of annotations per page (or null for one big page with all annotations on it).
         * @param {int} pageNumber The page number to return (or null for the first page).
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified graph.
         */
        getAnnotations (id, layerId, pageLength, pageNumber, onResult) {
	    this.createRequest("getAnnotations", { id : id, layerId : layerId, pageLength : pageLength, pageNumber : pageNumber }, onResult).send();
        }
        
        /**
         * Gets the given anchors in the given graph.
         * @param {string} id The given graph ID.
         * @param {string[]} anchorId The IDs of the anchors to load.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  The identified graph.
         */
        getAnchors (id, anchorId, onResult) {
	    this.createRequest("getAnchors", { id : id, anchorId : anchorId }, onResult).send();
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
         * List the media available for the given graph.
         * @param {string} id The graph ID.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be:  List of media files available for the given graph.
         */
        getAvailableMedia(id, onResult) {
	    this.createRequest("getAvailableMedia", { id : id }, onResult).send();
        }
        
        /**
         * Gets a given media track for a given graph.
         * @param {string} id The graph ID.
         * @param {string} trackSuffix The track suffix of the media.
         * @param {string} mimeType The MIME type of the media.
         * @param {resultCallback} onResult Invoked when the request has returned a
         * <var>result</var> which will be: {string} A URL to the given media for the given
         * graph, or null if the given media doesn't exist.
         */
        getMedia(id, trackSuffix, mimeType, onResult) {
	    this.createRequest("getMedia", { id : id, trackSuffix : trackSuffix, mimeType : mimeType}, onResult).send();
        }
        
    } // class GraphStoreQuery

    // GraphStore class - read/write "edit" access

    /**
     * Read/write interaction with LaBB-CAT corpora, based on the  
     * <a href="https://nzilbb.github.io/ag/javadoc/nzilbb/ag/IGraphStore.html">nzilbb.ag.IGraphStore</a>.
     * interface
     * @example
     * // create annotation store client
     * const store = new GraphStore("https://labbcat.canterbury.ac.nz", "demo", "demo");
     * // get a corpus
     * store.getCorpusIds((corpora, errors, messages, call)=>{ 
     *     console.log("transcripts in: " + corpora[0]); 
     *     store.getGraphIdsInCorpus(corpora[0], (ids, errors, messages, call, id)=>{ 
     *         console.log("Deleting all transcripts in " + id));
     *         for (i in ids) {
     *           store.deleteGraph(ids[i], (ids, errors, messages, call, id)=>{ 
     *               console.log("deleted " + id);
     *             });
     *         }
     *       });
     *   });
     * store.deleteGraph(documents[0]);
     * @extends GraphStoreQuery
     * @author Robert Fromont robert@fromont.net.nz
     */
    class GraphStore extends GraphStoreQuery{
        /** 
         * Create a store client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link)
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            super(baseUrl, username, password);
            this._storeQueryUrl = this.baseUrl + "edit/store/";
        }

        /**
         * Saves the given graph. The graph can be partial e.g. include only some of the layers that the stored version of the graph contains.
         * @param graph The graph to save.
         * @param {resultCallback} onResult Invoked when the request has returned a 
         * <var>result</var> which will be:  true if changes were saved, false if there
         * were no changes to save.
         */
        saveGraph(graph, onResult) { // TODO
        }
    
        /**
         * Saves the given media for the given graph
         * @param {string} id The graph ID
         * @param {string} trackSuffix The track suffix of the media.
         * @param {string} mediaUrl A URL to the media content.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveMedia(id, trackSuffix, mediaUrl, onResult) { // TODO
        }
        
        /**
         * Saves the given source file (transcript) for the given graph.
         * @param {string} id The graph ID
         * @param {string} url A URL to the transcript.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveSource(id, url, onResult) { // TODO
        }

        /**
         * Saves the given document for the episode of the given graph.
         * @param {string} id The graph ID
         * @param {string} url A URL to the document.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        saveEpisodeDocument(id, url, onResult) { // TODO
        }
        
        /**
         * Deletes the given graph, and all assciated media, from the graph store..
         * @param {string} id The graph ID
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        deleteGraph(id, onResult) { // TODO
        }
    }
    
    // Labbcat class - GraphStore plus some LaBB-CAT specific functions
    
    /**
     * Labbcat client, for accessing LaBB-CAT server functions programmatically.
     * @example
     * // create LaBB-CAT client
     * const labbcat = new [Labbcat("https://labbcat.canterbury.ac.nz", "demo", "demo")]{@link Labbcat};
     * // upload a transcript
     * labbcat.newTranscript(
     *     transcript, media, null, "interview", "corpus", episode, 
     *     (result, errors, messages, call, id)=>{
     *         console.log("Finished uploading " + transcript.name);
     *         for (var e in errors) console.log("ERROR " + errors[e]);
     *     });
     *
     * @extends GraphStore
     * @author Robert Fromont robert@fromont.net.nz
     */
    class Labbcat extends GraphStore {
        /** 
         * Create a query client 
         * @param {string} baseUrl The LaBB-CAT base URL (i.e. the address of the 'home' link).
         * @param {string} username The LaBB-CAT user name.
         * @param {string} password The LaBB-CAT password.
         */
        constructor(baseUrl, username, password) {
            super(baseUrl, username, password); 
            if (exports.verbose) console.log("Labbcat: "+this.baseUrl);
        }

        /**
         * Uploads a new transcript.
         * @param {file} transcript The transcript to upload.
         * @param {file|file[]} media The media to upload, if any.
         * @param {string} mediaSuffix The media suffix for the media.
         * @param {string} transcriptType The transcript type.
         * @param {string} corpus The corpus for the transcript.
         * @param {string} episode The episode the transcript belongs to.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         * @param onProgress Invoked on XMLHttpRequest progress.
         */
        newTranscript(transcript, media, mediaSuffix, transcriptType, corpus, episode, onResult, onProgress) {
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
			        fd.append("uploadmedia"+mediaSuffix+"1", 
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
	            if (labbcat.username && labbcat.password) {
		        requestParameters.auth = labbcat.username+':'+labbcat._password;
	            }
	            if (/^https.*/.test(labbcat.baseUrl)) {
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
			        try {
			            var response = JSON.parse(responseText);
			            var result = response.model.result || response.model;
			            var errors = response.errors;
			            if (errors.length == 0) errors = null
			            var messages = response.messages;
			            if (messages.length == 0) messages = null
			            onResult(result, errors, messages, "newTranscript", transcriptName);
			        } catch(exception) {
			            onResult(null, ["" +exception+ ": " + labbcat.responseText], [], "newTranscript", transcript.name);
			        }
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
         * @param {file} transcript The transcript to upload.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         * @param onProgress Invoked on XMLHttpRequest progress.
         */
        updateTranscript(transcript, onResult, onProgress) {
            // create form
            var fd = new FormData();
            fd.append("todo", "update");
            fd.append("auto", "true");
            
            if (!runningOnNode) {	
                
	        fd.append("uploadfile1_0", transcript);
                
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
	            xhr.setRequestHeader("Authorization", "Basic " + btoa(this.username + ":" + this._password))
	        }
	        xhr.setRequestHeader("Accept", "application/json");
	        xhr.send(fd);
            } else { // runningOnNode
	        
	        // on node.js, files are actually paths
	        var transcriptName = transcript.replace(/.*\//g, "");
	        fd.append("uploadfile1_0", 
		          fs.createReadStream(transcript).on('error', function(){
		              onResult(null, ["Invalid transcript: " + transcriptName], [], "newTranscript", transcriptName);
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
		            console.log('data ' + buffer);
		            responseText += buffer;
		        });
		        res.on('end',function(){
		            try {
			        var response = JSON.parse(responseText);
			        var result = response.model.result || response.model;
			        var errors = response.errors;
			        if (errors.length == 0) errors = null
			        var messages = response.messages;
			        if (messages.length == 0) messages = null
			        onResult(result, errors, messages, "newTranscript", transcriptName);
		            } catch(exception) {
			        onResult(null, ["" +exception+ ": " + this.responseText], [], "newTranscript", transcript.name);
		            }
		        });
	            } else {
		        onResult(null, ["" +err+ ": " + this.responseText], [], "newTranscript", transcriptName);
	            }
                    
	            if (res) res.resume();
	        });
            }
        }

        /**
         * Delete a transcript.
         * @param {string} id ID of the transcript.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        deleteTranscript(id, onResult) {
            this.createRequest("deleteTranscript", { id : id, transcript_id : id, btnConfirmDelete : true, chkDb : true }, onResult, this.baseUrl + "edit/transcript/delete").send();
        }
        
        // TODO search(pattern, participantId=NULL, main.participant=TRUE)
        // TODO getMatches(threadId, words.context=0)
        // TODO getMatchAnnotations(matchIds, layerIds, targetOffset=0, annotationsPerLayer=1)
        // TODO getSoundFragments(id, start, end, sampleRate = NULL)
        // TODO getFragments(id, start, end, layerIds, mimeType = "text/praat-textgrid")
        
        /**
         * Gets list of tasks.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        getTasks(onResult) {
            this.createRequest("getTasks", null, onResult, this.baseUrl + "threads").send();
        }
        
        /**
         * Gets the status of a task.
         * @param {string} id ID of the task.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        taskStatus(id, onResult) {
            this.createRequest("taskStatus", { id : id, threadId : id }, onResult, this.baseUrl + "thread").send();
        }

        /**
         * Releases a finished a task so it no longer uses resources on the server.
         * @param {string} id ID of the task.
         * @param {resultCallback} onResult Invoked when the request has returned a result.
         */
        releaseTask(id, onResult) {
            this.createRequest("releaseTask", { id : id, threadId : id, command : "release" }, onResult, this.baseUrl + "threads").send();
        }
    } // class Labbcat
    
    exports.GraphStoreQuery = GraphStoreQuery;
    exports.GraphStore = GraphStore;
    exports.Labbcat = Labbcat;
    exports.verbose = false;

}(typeof exports === 'undefined' ? this.labbcat = {} : exports));

'use strict';

/**
 * Unit tests for GraphStoreQuery.
 * <p>These tests test the functionality of the client library, not the server. 
 * <p>They assume the existence of a valid LaBB-CAT instance (configured by
 * <var>labbcatUrl</var>) which responds correctly to requests, but do not generally test
 * that the server behaves correctly , nor assume specific corpus content. For the tests
 * to work, the first graph listed in LaBB-CAT must have some words and some media, and
 * the first participant listed must have some transcripts. 
 */

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');

describe("#MatchId", ()=>{

    it("parses anchor IDs", (done)=>{
        const matchId = new labbcat.MatchId(
            "g_3;em_11_23;n_19985-n_20003;p_4;#=ew_0_12611;prefix=001-;[0]=ew_0_12611");

        assert.equal(matchId.graphId, "g_3", "parses graphId");
        assert.equal(matchId.utteranceId, "em_11_23", "parses utteranceId");
        assert.equal(matchId.startAnchorId, "n_19985", "parses startAnchorId");
        assert.equal(matchId.endAnchorId, "n_20003", "parses endAnchorId");
        assert.equal(matchId.participantId, "p_4", "parses participantId");
        assert.equal(matchId.targetId, "ew_0_12611", "parses targetId");
        assert.equal(matchId.prefix, "001-", "parses prefix");
        assert.isNull(matchId.startOffset, "no startOffset");
        assert.isNull(matchId.endOffset, "no endOffset");
        
        done();
    });
    
    it("parses offsets", (done)=>{
        const matchId = new labbcat.MatchId(
            "AgnesShacklock-01.trs;60.897-67.922;prefix=001-");

        assert.equal(matchId.graphId, "AgnesShacklock-01.trs", "parses graphId");
        assert.isNull(matchId.utteranceId, "no utteranceId");
        assert.isNull(matchId.startAnchorId, "no startAnchorId");
        assert.isNull(matchId.endAnchorId, "no endAnchorId");
        assert.isNull(matchId.participantId, "no participantId");
        assert.isNull(matchId.targetId, "no targetId");
        assert.equal(matchId.prefix, "001-", "parses prefix");
        assert.equal(matchId.startOffset, 60.897, "parses startOffset");
        assert.equal(matchId.endOffset, 67.922, "parses endOffset");
        
        done();
    });
    
});

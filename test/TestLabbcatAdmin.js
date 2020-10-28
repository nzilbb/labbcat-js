'use strict';

/**
 * Unit tests for LabbcatAdmin.
 * <p>These tests test the functionality of the client library, not the server. 
 * <p>They assume the existence of a valid LaBB-CAT instance (configured by
 * <var>labbcatUrl</var>) which responds correctly to requests, but do not generally test
 * that the server behaves correctly , nor assume specific corpus content. For the tests
 * to work, the first transcript listed in LaBB-CAT must have some words and some media, and
 * the first participant listed must have some transcripts. 
 */

const assert = require('chai').assert;
const labbcat = require('../nzilbb.labbcat');

// YOU MUST ENSURE THE FOLLOWING SETTINGS ARE VALID FOR YOU TEST LABBCAT SERVER:
const baseUrl = "http://localhost:8080/labbcat/";
const username = "labbcat";
const password = "labbcat";
var store = null;

describe("#LabbcatAdmin", function() {
    // waitForTask and getMatches can take a few seconds
    this.timeout(45000);

    before((done)=>{
        store = new labbcat.LabbcatAdmin(baseUrl, username, password);
        store.getId((id, errors, messages)=>{
            assert.isNull(
                errors, "\nCould not connect to LaBB-CAT."
                    +"\nThese unit tests require a running LaBB-CAT server to test against."
                    +"\nPlease check the baseUrl variable refers to a running LaBB-CAT server.");
            done();
        });
    });

    beforeEach((done)=>{
        // verbosity only applies in tests that enable it
        labbcat.verbose = false;
        labbcat.language = "en";
        done();
    });

    it("inherits methods (getId at least)", (done)=>{
        assert.equal(baseUrl + "api/store/", store.storeUrl);
        assert.equal(baseUrl + "api/edit/store/", store.storeEditUrl);
        assert.equal(baseUrl + "api/admin/store/", store.storeAdminUrl);
        store.getId((result, errors, messages, call)=>{
            assert.isNull(errors);
            assert.equal(baseUrl, result);
            done();
        });
    });

    it("localizes messages", (done)=>{
        labbcat.language = "es";
        // can't delete it again
        store.deleteCorpus(
            "this corpus doesn't exist", (result, errors, messages) =>{
                assert.isNotNull(errors, "deleteCorpus fails for nonexistant corpus ID");
                assert.include(errors[0], "no existe");
                done();
            });                                            
    });
    
    it("implements corpus CRUD operations", (done)=>{
        
        const corpus_name = "unit-test";
        const corpus_language = "en";
        const corpus_description = "Temporary corpus for unit testing";
        
        // ensure the record doesn't exist to start with
        store.deleteCorpus(corpus_name, (result, errors, messages)=>{

            // create the corpus
            store.createCorpus(
                corpus_name, corpus_language, corpus_description, (corpus, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(corpus);
                    assert.equal(corpus.corpus_name, corpus_name,
                                 "corpus_name saved");
                    assert.equal(corpus.corpus_language, corpus_language,
                                 "corpus_language saved");
                    assert.equal(corpus.corpus_description, corpus_description,
                                 "corpus_description saved");
                    
                    // ensure the corpus exists
                    store.readCorpora((corpora, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(corpora, "The corpora are returned")
                        assert.isAtLeast(corpora.length, 1, "There is at least one corpus");
                        
                        const matchedCorpora = corpora.filter(c => {
                            return c.corpus_name == corpus_name;});
                        assert.equal(matchedCorpora.length, 1,
                                     "The new corpus is present: " + JSON.stringify(corpora));
                        assert.equal(matchedCorpora[0].corpus_name, corpus_name,
                                     "corpus_name present");
                        assert.equal(matchedCorpora[0].corpus_language, corpus_language,
                                     "corpus_language correct");
                        assert.equal(matchedCorpora[0].corpus_description, corpus_description,
                                     "corpus_description correct");
                        
                        // update it
                        const new_corpus_language = "es";
                        const new_corpus_description = "Temporary Spanish corpus for unit testing";
                        store.updateCorpus(
                            corpus_name, new_corpus_language, new_corpus_description,
                            (updatedCorpus, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedCorpus);
                                assert.equal(updatedCorpus.corpus_name, corpus_name,
                                             "corpus_name unchanged");
                                assert.equal(updatedCorpus.corpus_language, new_corpus_language,
                                             "corpus_language changed");
                                assert.equal(updatedCorpus.corpus_description, new_corpus_description,
                                             "corpus_description changed");
                                
                                
                                // ensure the corpus updated
                                store.readCorpora((corpora, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(corpora, "The corpora are returned")
                                    assert.isAtLeast(corpora.length, 1, "There is at least one corpus");
                                    
                                    const newMatchedCorpora = corpora.filter(c => {
                                        return c.corpus_name == corpus_name;});
                                    assert.equal(
                                        newMatchedCorpora.length, 1,
                                        "The updated corpus is present");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_name, corpus_name,
                                        "updated corpus_name correct");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_language, new_corpus_language,
                                        "updated corpus_language correct");
                                    assert.equal(
                                        newMatchedCorpora[0].corpus_description,
                                        new_corpus_description,
                                        "updated corpus_description correct");
                                    
                                    // delete it
                                    store.deleteCorpus(
                                        corpus_name, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the corpus no longer exists
                                            store.readCorpora((corpora, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(corpora, "The corpora are returned")
                                                
                                                const finalMatchedCorpora = corpora.filter(c => {
                                                    return c.corpus_name == corpus_name;});
                                                assert.equal(finalMatchedCorpora.length, 0,
                                                             "The new corpus is gone");
                                                
                                                // can't delete it again
                                                store.deleteCorpus(
                                                    corpus_name, (result, errors, messages) =>{
                                                        assert.isNotNull(
                                                            errors,
                                                            "deleteCorpus fails for nonexistant corpus ID");
                                                        assert.include(errors[0], "not found");
                                                        done();
                                                    });                                            
                                            });
                                        });
                                });
                            });
                    });
                });
        });
    });
    
    it("implements project CRUD operations", (done)=>{

        const project_name = "unit-test";
        const description = "Temporary project for unit testing";
        
        // ensure the record doesn't exist to start with
        store.deleteProject(project_name, (result, errors, messages)=>{
            
            // create the project
            store.createProject(
                project_name, description, (project, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(project);
                    assert.equal(project.project, project_name, "project saved");
                    assert.equal(project.description, description, "description saved");
                    
                    // ensure the project exists
                    store.readProjects((projects, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(projects, "The projects are returned")
                        assert.isAtLeast(projects.length, 1, "There is at least one project");
                        
                        const matchedProjects = projects.filter(c => {
                            return c.project == project_name;});
                        assert.equal(matchedProjects.length, 1,
                                     "The new project is present: " + JSON.stringify(projects));
                        assert.equal(matchedProjects[0].project, project_name,
                                     "project name present");
                        assert.equal(matchedProjects[0].description, description,
                                     "description correct");
                        
                        // update it
                        const new_description = "New description";
                        store.updateProject(
                            project_name, new_description,
                            (updatedProject, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedProject);
                                assert.equal(updatedProject.project, project_name,
                                             "project name unchanged");
                                assert.equal(updatedProject.description, new_description,
                                             "description changed");
                                
                                // ensure the project updated
                                store.readProjects((projects, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(projects, "The projects are returned")
                                    assert.isAtLeast(projects.length, 1,
                                                     "There is at least one project");
                                    
                                    const newMatchedProjects = projects.filter(c => {
                                        return c.project == project_name;});
                                    assert.equal(
                                        newMatchedProjects.length, 1,
                                        "The updated project is present");
                                    assert.equal(
                                        newMatchedProjects[0].project, project_name,
                                        "updated project name correct");
                                    assert.equal(
                                        newMatchedProjects[0].description,
                                        new_description,
                                        "updated description correct");
                                    
                                    // delete it
                                    store.deleteProject(
                                        project_name, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readProjects((projects, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(projects, "The projects are returned")
                                                
                                                const finalMatchedProjects = projects.filter(c => {
                                                    return c.project == project_name;});
                                                assert.equal(finalMatchedProjects.length, 0,
                                                             "The new project is gone");
                                                
                                                // can't delete it again
                                                store.deleteProject(
                                                    project_name, (result, errors, messages) =>{
                                                        assert.isNotNull(
                                                            errors,
                                                            "deleteProject fails for nonexistant project ID");
                                                        assert.include(errors[0], "not found");
                                                        done();
                                                    });                                            
                                            });
                                        });
                                });
                            });
                    });
                });
        });
    });

    it("implements mediatrack CRUD operations", (done)=>{

        const track_suffix = "unit-test";
        const description = "Temporary track for unit testing";
        const display_order = 99;
        
        // ensure the record doesn't exist to start with
        store.deleteMediaTrack(track_suffix, (result, errors, messages)=>{
            
            // create the track
            store.createMediaTrack(
                track_suffix, description, display_order, (track, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(track);
                    assert.equal(track.suffix, track_suffix, "track saved");
                    assert.equal(track.description, description, "description saved");
                    assert.equal(track.display_order, display_order, "display_order saved");
                    
                    // ensure the track exists
                    store.readMediaTracks((tracks, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(tracks, "The tracks are returned")
                        assert.isAtLeast(tracks.length, 1, "There is at least one track");
                        
                        const matchedTracks = tracks.filter(c => {
                            return c.suffix == track_suffix;});
                        assert.equal(matchedTracks.length, 1,
                                     "The new track is present: " + JSON.stringify(tracks));
                        assert.equal(matchedTracks[0].suffix, track_suffix,
                                     "track suffix present");
                        assert.equal(matchedTracks[0].description, description,
                                     "description correct");
                        assert.equal(matchedTracks[0].display_order, display_order,
                                     "display_order correct");
                        
                        // update it
                        const new_description = "New description";
                        const new_display_order = 100;
                        store.updateMediaTrack(
                            track_suffix, new_description, new_display_order,
                            (updatedTrack, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedTrack);
                                assert.equal(updatedTrack.suffix, track_suffix,
                                             "track suffix unchanged");
                                assert.equal(updatedTrack.description, new_description,
                                             "description changed");
                                assert.equal(updatedTrack.display_order, new_display_order,
                                             "display_order changed");
                                
                                // ensure the track updated
                                store.readMediaTracks((tracks, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(tracks, "The tracks are returned")
                                    assert.isAtLeast(tracks.length, 1,
                                                     "There is at least one track");
                                    
                                    const newMatchedTracks = tracks.filter(c => {
                                        return c.suffix == track_suffix;});
                                    assert.equal(
                                        newMatchedTracks.length, 1,
                                        "The updated track is present");
                                    assert.equal(
                                        newMatchedTracks[0].suffix, track_suffix,
                                        "updated track suffix correct");
                                    assert.equal(
                                        newMatchedTracks[0].description,
                                        new_description,
                                        "updated description correct");
                                    assert.equal(
                                        newMatchedTracks[0].display_order,
                                        new_display_order,
                                        "updated display_order correct");
                                    
                                    // delete it
                                    store.deleteMediaTrack(
                                        track_suffix, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readMediaTracks((tracks, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(tracks, "The tracks are returned")
                                                
                                                const finalMatchedTracks = tracks.filter(c => {
                                                    return c.suffix == track_suffix;});
                                                assert.equal(finalMatchedTracks.length, 0,
                                                             "The new track is gone");
                                                
                                                // can't delete it again
                                                store.deleteMediaTrack(
                                                    track_suffix, (result, errors, messages) =>{
                                                        assert.isNotNull(
                                                            errors,
                                                            "deleteTrack fails for nonexistant track ID");
                                                        assert.include(errors[0], "not found");
                                                        done();
                                                    });                                            
                                            });
                                        });
                                });
                            });
                    });
                });
        });
    });
    
    it("implements role CRUD operations", (done)=>{

        const role_id = "unit-test";
        const description = "Temporary role for unit testing";
        
        // ensure the record doesn't exist to start with
        store.deleteRole(role_id, (result, errors, messages)=>{
            
            // create the role
            store.createRole(
                role_id, description, (role, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(role);
                    assert.equal(role.role_id, role_id, "role saved");
                    assert.equal(role.description, description, "description saved");
                    
                    // ensure the role exists
                    store.readRoles((roles, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(roles, "The roles are returned")
                        assert.isAtLeast(roles.length, 1, "There is at least one role");
                        
                        const matchedRoles = roles.filter(c => {
                            return c.role_id == role_id;});
                        assert.equal(matchedRoles.length, 1,
                                     "The new role is present: " + JSON.stringify(roles));
                        assert.equal(matchedRoles[0].role_id, role_id,
                                     "role name present");
                        assert.equal(matchedRoles[0].description, description,
                                     "description correct");
                        
                        // update it
                        const new_description = "New description";
                        store.updateRole(
                            role_id, new_description,
                            (updatedRole, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedRole);
                                assert.equal(updatedRole.role_id, role_id,
                                             "role name unchanged");
                                assert.equal(updatedRole.description, new_description,
                                             "description changed");
                                
                                // ensure the role updated
                                store.readRoles((roles, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(roles, "The roles are returned")
                                    assert.isAtLeast(roles.length, 1,
                                                     "There is at least one role");
                                    
                                    const newMatchedRoles = roles.filter(c => {
                                        return c.role_id == role_id;});
                                    assert.equal(
                                        newMatchedRoles.length, 1,
                                        "The updated role is present");
                                    assert.equal(
                                        newMatchedRoles[0].role_id, role_id,
                                        "updated role name correct");
                                    assert.equal(
                                        newMatchedRoles[0].description,
                                        new_description,
                                        "updated description correct");
                                    
                                    // delete it
                                    store.deleteRole(
                                        role_id, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readRoles((roles, errors, messages)=>{
                                                assert.isNull(errors, JSON.stringify(errors))
                                                assert.isNotNull(roles, "The roles are returned")
                                                
                                                const finalMatchedRoles = roles.filter(c => {
                                                    return c.role_id == role_id;});
                                                assert.equal(finalMatchedRoles.length, 0,
                                                             "The new role is gone");
                                                
                                                // can't delete it again
                                                store.deleteRole(
                                                    role_id, (result, errors, messages) =>{
                                                        assert.isNotNull(
                                                            errors,
                                                            "deleteRole fails for nonexistant role ID");
                                                        assert.include(errors[0], "not found");
                                                        done();
                                                    });                                            
                                            });
                                        });
                                });
                            });
                    });
                });
        });
    });

    it("implements role permission CRUD operations", (done)=>{

        const role_id = "admin"; // a role_id sure to exist
        const entity = "t";
        const layer = "corpus";
        const value_pattern = "unit-test.*";
        
        // ensure the record doesn't exist to start with
        store.deleteRolePermission(role_id, entity, (result, errors, messages)=>{
            
            // create the role
            store.createRolePermission(
                role_id, entity, layer, value_pattern, (record, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(record);
                    assert.equal(record.role_id, role_id, "role_id saved");
                    assert.equal(record.entity, entity, "entity saved");
                    assert.equal(record.layer, layer, "layer saved");
                    assert.equal(record.value_pattern, value_pattern, "value_pattern saved");
                    
                    // ensure the role exists
                    store.readRolePermissions(role_id, (records, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(records, "The records are returned")
                        assert.isAtLeast(records.length, 1, "There is at least one record");

                        for (var c of records) {
                            assert.equal(c.role_id, role_id, "only select role returned");
                        }
                        
                        const matchedRecords = records.filter(c => {
                            return c.role_id == role_id && c.entity == entity;});
                        assert.equal(
                            matchedRecords.length, 1,
                            "The new record is present: " + JSON.stringify(matchedRecords));
                        assert.equal(matchedRecords[0].role_id, role_id, "role_id present");
                        assert.equal(matchedRecords[0].entity, entity, "entity present");
                        assert.equal(matchedRecords[0].layer, layer, "layer present");
                        assert.equal(matchedRecords[0].value_pattern, value_pattern,
                                     "value_pattern present");
                        
                        // update it
                        const new_layer = "transcript_language";
                        const new_value_pattern = "en.*";
                        store.updateRolePermission(
                            role_id, entity, new_layer, new_value_pattern,
                            (updatedRecord, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedRecord);
                                assert.equal(updatedRecord.role_id, role_id, "role_id unchanged");
                                assert.equal(updatedRecord.entity, entity, "entity unchanged");
                                assert.equal(updatedRecord.layer, new_layer, "layer changed");
                                assert.equal(updatedRecord.value_pattern, new_value_pattern,
                                             "value_pattern changed");
                                
                                // ensure the role updated
                                store.readRolePermissions(role_id, (updatedRecords, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(
                                        updatedRecords, "Updated records are returned")
                                    assert.isAtLeast(updatedRecords.length, 1,
                                                     "There is at least one updated record");
                                    
                                    const updatedMatchedRecords = updatedRecords.filter(c => {
                                        return c.role_id == role_id && c.entity == entity;});
                                    assert.equal(
                                        updatedMatchedRecords.length, 1,
                                        "The updated record is present: "
                                            + JSON.stringify(updatedRecords));
                                    assert.equal(updatedMatchedRecords[0].role_id, role_id,
                                                 "updated role_id present");
                                    assert.equal(updatedMatchedRecords[0].entity, entity,
                                                 "updated entity present");
                                    assert.equal(
                                        updatedMatchedRecords[0].layer, new_layer,
                                        "layer updated");
                                    assert.equal(updatedMatchedRecords[0].value_pattern,
                                                 new_value_pattern,
                                                 "value_pattern updated");
                                    
                                    // delete it
                                    store.deleteRolePermission(
                                        role_id, entity, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readRolePermissions(
                                                role_id, (records, errors, messages)=>{
                                                    assert.isNull(errors, JSON.stringify(errors))
                                                    assert.isNotNull(
                                                        records, "The roles are returned")
                                                    
                                                    const finalMatchedRecords
                                                          = records.filter(c => {
                                                              return c.role_id == role_id
                                                                  && c.entity == entity;});
                                                    assert.equal(finalMatchedRecords.length, 0,
                                                                 "The new record is gone");
                                                    
                                                    // can't delete it again
                                                    store.deleteRolePermission(
                                                        role_id, entity,
                                                        (result, errors, messages) =>{
                                                            assert.isNotNull(
                                                                errors,
                                                                "deleteRole fails for nonexistant record");
                                                            assert.include(
                                                                errors[0], "not found");
                                                            done();
                                                        });
                                                });
                                        });
                                });
                            });
                    });
                });
        });
    });

    it("implements system attribute RU operations", (done)=>{

        // ensure the project exists
        store.readSystemAttributes((systemAttributes, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isNotNull(systemAttributes, "The system attributes are returned")
            assert.isAtLeast(systemAttributes.length, 1, "There is at least one system attribute");
            
            const titleAttributes = systemAttributes.filter(c => {
                return c.attribute == "title";});
            assert.equal(titleAttributes.length, 1,
                         "The new title is present: " + JSON.stringify(systemAttributes));
            assert.isNotNull(titleAttributes[0].type, "type present");
            assert.isNotNull(titleAttributes[0].style, "style present");
            assert.isNotNull(titleAttributes[0].label, "label present");
            assert.isNotNull(titleAttributes[0].description, "description present");
            assert.isNotNull(titleAttributes[0].value, "value present");
            
            // update it
            const newValue = "unit-test";
            store.updateSystemAttribute(
                "title", newValue, (updatedSystemAttribute, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors))
                    assert.isNotNull(updatedSystemAttribute);
                    assert.equal(updatedSystemAttribute.attribute, titleAttributes[0].attribute,
                                 "systemAttribute ID unchanged");
                    assert.equal(updatedSystemAttribute.value, newValue,
                                 "value changed");
                                
                    // ensure the systemAttribute updated
                    store.readSystemAttributes((systemAttributes, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(systemAttributes, "The systemAttributes are returned")
                        assert.isAtLeast(systemAttributes.length, 1,
                                         "There is at least one systemAttribute");
                        
                        const newMatchedTitle = systemAttributes.filter(c => {
                            return c.attribute == "title";});
                        assert.equal(newMatchedTitle.length, 1,
                                     "The updated systemAttribute is present");
                        assert.equal(newMatchedTitle[0].attribute, "title",
                                     "updated systemAttribute name correct");
                        assert.equal(newMatchedTitle[0].value, newValue,
                                     "updated description correct");
                        
                        // restore original value
                        store.updateSystemAttribute(
                            "title", titleAttributes[0].value, (result, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                done();
                            });
                    });
                });
        });
    });
    
    it("implements info RU operations", (done)=>{

        store.getInfo((originalInfo, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotNull(originalInfo);

            // update it
            const changedInfo = originalInfo + " <div>unit-test</div>";
            labbcat.verbose = true;
            store.updateInfo(
                changedInfo, (result, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors))
                                
                    // ensure it was updated
                    store.getInfo((newInfo, errors, messages)=>{
                        assert.isNull(errors);
                        console.log("newInfo " + newInfo);
                        assert.equal(newInfo, changedInfo, "Information was updated");
                        
                        // restore original value
                        store.updateInfo(
                            originalInfo, (result, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                done();
                            });
                    });
                });
        });
    });
    
    it("implements saveLayer", (done)=>{

        store.getLayer("transcript_type", (originalTranscriptType, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors))
            assert.isNotNull(originalTranscriptType, "There is a transcript_type layer")
            
            const editedTranscriptType1 = JSON.parse(JSON.stringify(originalTranscriptType));
            const newOption1 = "unit-test-1";
            editedTranscriptType1.validLabels[newOption1] = newOption1;            
            
            const editedTranscriptType2 = JSON.parse(JSON.stringify(originalTranscriptType));
            const newOption2 = "unit-test-2";
            editedTranscriptType2.validLabels[newOption2] = newOption2;

            // save with object
            store.saveLayer(editedTranscriptType1, (updatedTranscriptType1, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors))
                assert.isNotNull(updatedTranscriptType1);
                assert.isTrue(newOption1 in updatedTranscriptType1.validLabels,
                              "new option 1 is there: " + JSON.stringify(updatedTranscriptType1.validLabels));
                assert.isFalse(newOption2 in updatedTranscriptType1.validLabels,
                              "new option 2 is not there");

                // save with attributes
                store.saveLayer(editedTranscriptType2.id, editedTranscriptType2.parentId,
                                editedTranscriptType2.description,
                                editedTranscriptType2.alignment,
                                editedTranscriptType2.peers, editedTranscriptType2.peersOverlap,
                                editedTranscriptType2.parentIncludes,
                                editedTranscriptType2.saturated, editedTranscriptType2.type,
                                editedTranscriptType2.validLabels, editedTranscriptType2.category,
                                (updatedTranscriptType2, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors))
                    assert.isNotNull(updatedTranscriptType2);
                    assert.isFalse(newOption1 in updatedTranscriptType2.validLabels,
                                   "new option 1 is not there");
                    assert.isTrue(newOption2 in updatedTranscriptType2.validLabels,
                                  "new option 2 is there");
                    // restore original value
                    store.saveLayer(
                        originalTranscriptType, (result, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors))
                            done();
                        });
                });
            });
        });
    });
    
});

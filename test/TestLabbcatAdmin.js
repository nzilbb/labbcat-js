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
                    assert.equal(project.category, project_name, "project saved");
                    assert.equal(project.description, description, "description saved");
                    
                    // ensure the project exists
                    store.readProjects((projects, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(projects, "The projects are returned")
                        assert.isAtLeast(projects.length, 1, "There is at least one project");
                        
                        const matchedProjects = projects.filter(c => {
                            return c.category == project_name;});
                        assert.equal(matchedProjects.length, 1,
                                     "The new project is present: " + JSON.stringify(projects));
                        assert.equal(matchedProjects[0].category, project_name,
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
                                assert.equal(updatedProject.category, project_name,
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
                                        return c.category == project_name;});
                                    assert.equal(
                                        newMatchedProjects.length, 1,
                                        "The updated project is present");
                                    assert.equal(
                                        newMatchedProjects[0].category, project_name,
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
                                                    return c.category == project_name;});
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

    it("implements category CRUD operations", (done)=>{

        const scope = "participant";
        const class_id = "speaker";
        const category_name = "unit-test";
        const description = "Temporary category for unit testing";
        const display_order = 999;
        
        // ensure the record doesn't exist to start with
        store.deleteCategory(scope, category_name, (result, errors, messages)=>{
            
            // create the category
            store.createCategory(
                scope, category_name, description, display_order, (category, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(category);
                    assert.equal(category.category, category_name, "category saved");
                    assert.equal(category.class_id, class_id, "class_id correct");
                    assert.equal(category.description, description, "description saved");
                    
                    // ensure the category exists
                    store.readCategories(scope, (categories, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors))
                        assert.isNotNull(categories, "The categories are returned")
                        assert.isAtLeast(categories.length, 1, "There is at least one category");
                        
                        const matchedCategories = categories.filter(c => {
                            return c.category == category_name;});
                        assert.equal(matchedCategories.length, 1,
                                     "The new category is present: " + JSON.stringify(categories));
                        assert.equal(matchedCategories[0].category, category_name,
                                     "category name present");
                        assert.equal(matchedCategories[0].description, description,
                                     "description correct");
                        
                        // update it
                        const new_description = "New description";
                        const new_display_order = 9999;
                        store.updateCategory(
                            scope, category_name, new_description, new_display_order,
                            (updatedCategory, errors, messages)=>{
                                assert.isNull(errors, JSON.stringify(errors))
                                assert.isNotNull(updatedCategory);
                                assert.equal(updatedCategory.category, category_name,
                                             "category name unchanged");
                                assert.equal(updatedCategory.description, new_description,
                                             "description changed");
                                assert.equal(updatedCategory.display_order, new_display_order,
                                             "display_order changed");
                                
                                // ensure the category updated
                                store.readCategories(scope, (categories, errors, messages)=>{
                                    assert.isNull(errors, JSON.stringify(errors))
                                    assert.isNotNull(categories, "The categories are returned")
                                    assert.isAtLeast(categories.length, 1,
                                                     "There is at least one category");
                                    
                                    const newMatchedCategories = categories.filter(c => {
                                        return c.category == category_name;});
                                    assert.equal(
                                        newMatchedCategories.length, 1,
                                        "The updated category is present");
                                    assert.equal(
                                        newMatchedCategories[0].category, category_name,
                                        "updated category name correct");
                                    assert.equal(
                                        newMatchedCategories[0].description,
                                        new_description,
                                        "updated description correct");
                                    assert.equal(
                                        newMatchedCategories[0].display_order,
                                        new_display_order,
                                        "updated display_order correct");
                                    
                                    // delete it
                                    store.deleteCategory(
                                        scope, category_name, (result, errors, messages)=>{
                                            assert.isNull(errors, JSON.stringify(errors))
                                            
                                            // ensure the transcript no longer exists
                                            store.readCategories(
                                                scope, (categories, errors, messages)=>{
                                                    assert.isNull(errors, JSON.stringify(errors))
                                                    assert.isNotNull(categories, "The categories are returned")
                                                    
                                                    const finalMatchedCategories = categories.filter(c => {
                                                        return c.category == category_name;});
                                                    assert.equal(finalMatchedCategories.length, 0,
                                                                 "The new category is gone");
                                                    
                                                    // can't delete it again
                                                    store.deleteCategory(
                                                        scope, category_name,
                                                        (result, errors, messages) =>{
                                                            assert.isNotNull(
                                                                errors,
                                                                "deleteCategory fails for nonexistant category ID");
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
    
    it("implements getInfo", (done)=>{

        store.getInfo((originalInfo, errors, messages)=>{
            assert.isNull(errors);
            assert.isNotNull(originalInfo);

            done();
        });
    });
    
    it("implements saveLayer for transcript_type", (done)=>{

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
    
    it("implements newLayer/saveLayer/deleteLayer for temporal layers", (done)=>{

        var testLayer = {
            id: "unit-test",
            description: "Unit test layer", 
            parentId: "word",
            alignment: 0,
            peers: true, peersOverlap: true, parentIncludes: true, saturated: true,
            type: "string"
            // TODO validLabels
        };

        // create layer
        store.newLayer(testLayer, (newLayer, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors));
            assert.isNotNull(newLayer, "Resulting layer is not null");
            assert.equal(newLayer.id, testLayer.id, "created ID");
            assert.equal(newLayer.description, testLayer.description, "created Description");
            assert.equal(newLayer.parentId, testLayer.parentId, "created parent");
            assert.equal(newLayer.alignment, testLayer.alignment, "created alignment");
            assert.equal(newLayer.peers, testLayer.peers, "created peers");
            assert.equal(newLayer.peersOverlap, testLayer.peersOverlap, "created peersOverlap");
            assert.equal(newLayer.parentIncludes, testLayer.parentIncludes, "created parentIncl.");
            assert.equal(newLayer.saturated, testLayer.saturated, "created saturated");
            assert.equal(newLayer.type, testLayer.type, "created Type");
            // TODO validLabels

            // check it's really there
            store.getLayer(testLayer.id, (retrievedLayer, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors));
                assert.isNotNull(retrievedLayer, "Resulting layer is not null");
                assert.equal(retrievedLayer.id, testLayer.id, "resulting ID");
                assert.equal(retrievedLayer.description, testLayer.description,
                             "resulting Description");
                assert.equal(retrievedLayer.parentId, testLayer.parentId, "resulting parent");
                assert.equal(retrievedLayer.alignment, testLayer.alignment, "resulting alignment");
                assert.equal(retrievedLayer.peers, testLayer.peers, "resulting peers");
                assert.equal(retrievedLayer.peersOverlap, testLayer.peersOverlap,
                             "resulting peersOverlap");
                assert.equal(retrievedLayer.parentIncludes, testLayer.parentIncludes,
                             "resulting parentIncl.");
                assert.equal(retrievedLayer.saturated, testLayer.saturated, "resulting saturated");
                assert.equal(retrievedLayer.type, testLayer.type, "resulting Type");
                // TODO validLabels
            
                // change the layer
                testLayer.description = "Changed description";
                testLayer.parentId = "turns"; // this shouldn't be updated
                testLayer.alignment = "2"; // string alignment must be handled
                testLayer.peers = "false"; // string booleans must be handled
                testLayer.peersOverlap = false;
                testLayer.parentIncludes = false;
                testLayer.saturated = false;
                testLayer.type = "number";

                store.saveLayer(testLayer, (editedLayer, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.isNotNull(editedLayer, "Resulting layer is not null");
                    assert.equal(editedLayer.id, testLayer.id, "changed ID");
                    assert.equal(editedLayer.description, testLayer.description, "changed Description");
                    assert.equal(editedLayer.parentId, "word", "haven't changed parent");
                    assert.equal(editedLayer.alignment, testLayer.alignment, "changed alignment");
                    assert.equal(editedLayer.peers, testLayer.peers, "changed peers");
                    assert.equal(editedLayer.peersOverlap, testLayer.peersOverlap,
                                 "changed peersOverlap");
                    assert.equal(editedLayer.parentIncludes, testLayer.parentIncludes,
                                 "changed parentIncl.");
                    assert.equal(editedLayer.saturated, testLayer.saturated,
                                 "changed saturated");
                    assert.equal(editedLayer.type, testLayer.type, "changed Type");
                    // TODO validLabels

                    // check it's really changed
                    store.getLayer(testLayer.id, (finalLayer, errors, messages)=>{
                        assert.isNull(errors, JSON.stringify(errors));
                        assert.isNotNull(finalLayer, "Resulting layer is not null");
                        assert.equal(finalLayer.id, testLayer.id, "created ID");
                        assert.equal(finalLayer.description, testLayer.description,
                                     "final Description");
                        assert.equal(finalLayer.parentId, "word", "final parent");
                        assert.equal(finalLayer.alignment, testLayer.alignment, "final alignment");
                        assert.equal(finalLayer.peers, testLayer.peers, "final peers");
                        assert.equal(finalLayer.peersOverlap, testLayer.peersOverlap,
                                     "final peersOverlap");
                        assert.equal(finalLayer.parentIncludes, testLayer.parentIncludes,
                                     "final parentIncl.");
                        assert.equal(finalLayer.saturated, testLayer.saturated, "final saturated");
                        assert.equal(finalLayer.type, testLayer.type, "final Type");
                        // TODO validLabels
                        
                        // delete it
                        store.deleteLayer(testLayer.id, (model, errors, messages)=>{
                            assert.isNull(errors, JSON.stringify(errors));

                            // ensure it's been deleted
                            store.getLayer(testLayer.id, (finalLayer, errors, messages)=>{
                                assert.isNull(
                                    errors, JSON.stringify(errors),
                                    "Should not be able to get layer that has been deleted: "
                                        + testLayer.id);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
    
    it("implements agreement.html CRUD operations", (done)=>{

      // get the agreement
      store.readAgreement((initialAgreement, errors, messages)=>{
        assert.isNull(errors, JSON.stringify(errors));
        if (initialAgreement) {
          console.log("Existing agreement is not blank, but will be deleted:");
          console.log(initialAgreement);
        }
        
        // create/update the agreement
        const testAgreement = "<h1>nzilbb.js unit test</h1>";
        store.updateAgreement(testAgreement, (updateResult, errors, messages)=>{
          assert.isNull(errors, JSON.stringify(errors));
          assert.isNotNull(messages);
          assert.equal(messages[0], "License agreement updated.");
          
          // ensure the agreement has been saved
          store.readAgreement((updatedAgreement, errors, messages)=>{
            assert.isNull(errors, JSON.stringify(errors));
            assert.isNotNull(updatedAgreement, "The agreement is returned")
            assert.equal(updatedAgreement, testAgreement,
                         "The content of the agreement is correct");

            // update the agreement
            const testAgreement2 = "<h1>nzilbb.js unit test - updated</h1>";
            store.updateAgreement(testAgreement2, (updateResult, errors, messages)=>{
              assert.isNull(errors, JSON.stringify(errors));
              assert.isNotNull(messages);
              assert.equal(messages[0], "License agreement updated.");
              
              // ensure the agreement has been changed
              store.readAgreement((updatedAgreement2, errors, messages)=>{
                assert.isNull(errors, JSON.stringify(errors));
                assert.isNotNull(updatedAgreement2, "An agreement is returned")
                assert.equal(updatedAgreement2, testAgreement2,
                             "The new content of the agreement is correct");
                
                // delete it
                store.deleteAgreement((deleteResult, errors, messages)=>{
                  assert.isNull(errors, JSON.stringify(errors));
                  assert.isNotNull(messages);
                  assert.equal(messages[0], "License agreement deleted.");
                  
                  // ensure it was deleted
                  store.readAgreement((deletedAgreement, errors, messages)=>{
                    assert.isNull(errors, JSON.stringify(errors));
                    assert.equal(deletedAgreement, "", "The agreement is blank");
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

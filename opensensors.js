var Promise = require("bluebird");
var bhttp = Promise.promisifyAll(require("bhttp"));
var fs = Promise.promisifyAll(require("fs"));
var extend = require('xtend');

// config encapsulates opensensors-api-key
// valid keys for config are: api-key (required)
module.exports = function(config) {
    var API_POST_OPTIONS = {
        headers: {
            Accept: "application/json",
            Authorization: "api-key " + config["api-key"]
        }
    };

    var API_BASE_URL = "https://api.opensensors.io";

    // helper (actually workhorse) method that does a GET to a URL
    // it appends the augmented payloads in the response to the second argument that gets passed to it
    // if the response body JSON contains a next element it recursively calls itself
    var recursiveGET = function(url, results, status, followNext){
        console.log("Current Num Results: " + results.length + " -> URL: " + url);
        return Promise.try(function(){
            return bhttp.get(url, API_POST_OPTIONS);
        }).catch(function(err){
            console.error(err);
        }).then(function(response){
            // if there's a non-null status object provided
            // lets reach into the status.filename
            // and modify the entry for status.serialnumber
            if(status && status.filename) {
                return Promise.try(function () {
                   return fs.readFileAsync(status.filename, 'utf8');
                }).then(function(content) {
                    return Promise.try(function () {
                        if(content == ""){
                            content = "{}";
                        }
                        var json = JSON.parse(content);
                        if (!json[status.serialNumber]) {
                            json[status.serialNumber] = {};
                        }

                        if(response.body.messages) {
                            json[status.serialNumber].numResults = results.length + response.body.messages.length;
                        }
                        else{
                            json[status.serialNumber].complete = true;
                            json[status.serialNumber].error = true;
                            json[status.serialNumber].errorMessage = "No messages found.";
                        }

                        if(results.length > 0) {
                            json[status.serialNumber].timestamp = results[results.length - 1].timestamp;
                        }

                        if(!response.body.next){
                            json[status.serialNumber].complete = true;
                        }
                        else{
                            json[status.serialNumber].complete = false;
                        }

                        return json;
                    }).catch(function () {
                        return null;
                    }).then(function (json) {
                        if(json) {
                            return fs.writeFileAsync(status.filename, JSON.stringify(json));
                        }
                        else{
                            return null;
                        }
                    });
                }).then(function(){
                    return response;
                });
            }
            else {
                return response; // pass it through
            }
        }).then(function(response){
            var augmentedPayloads = [];
            if(response.body.messages){
                augmentedPayloads = response.body.messages.map(function(msg){
                    // as it turns out nan is not valid JSON
                    var body = msg.payload.text.replace(/nan/g, 'null');
                    var datum = JSON.parse(body);
                    datum.timestamp = msg.date;
                    datum.topic = msg.topic;
                    return datum;
                });
            }

            return Promise.try(function(){
                return results.concat(augmentedPayloads);
            }).then(function(newResults){
                if(followNext && response.body.next){
                    return recursiveGET(API_BASE_URL + response.body.next, newResults, status, followNext);
                }
                else{
                    return newResults;
                }
            });
        });
    };

    // this function returns a string to append to a url path
    // to add the [flat] params object as a querystring
    function urlParams(params){
        var ret = "";
        if(Object.keys(params).length > 0){ // if there are any optional params
            ret += '?';

            var encodeParams = Object.keys(params).map(function(key){
                if(key != "status") { // special case, not an OpenSensors parameter
                    return key + '=' + params[key];
                }
            });

            ret += encodeParams.join('&');
        }
        return ret;
    }

    // this function returns a string to append to a url path
    // to add the [flat] params object as a querystring
    function collectMessagesBy(x, val, params){
        var API_MESSAGES_BY_PATH = "/v1/messages/" + x;
        var url = API_BASE_URL + API_MESSAGES_BY_PATH;
        if(!val){
            console.error(x + "is required");
            return Promise.resolve({});
        }

        url += "/" + val+ urlParams(params);

        var status = params ? extend(params.status) : null;

        return recursiveGET(url, [], status);
    }

    // returns an array of message payloads from the API, augmented with timestamp
    // valid optional param keys are "start-date", "end-date", and "dur"
    function collectMessagesByDevice(device, params){
        return collectMessagesBy("device", device, params);
    }

    // returns an array of message payloads from the API, augmented with timestamp
    // valid optional param keys are "start-date", "end-date", and "dur"
    function collectMessagesByTopic(topic, params){
        return collectMessagesBy("topic", topic, params);
    }

    // returns an array of message payloads from the API, augmented with timestamp
    // valid optional param keys are "start-date", "end-date", and "dur"
    function collectMessagesByUser(user, params){
        return collectMessagesBy("user", user, params);
    }

    // this is what require(opensensors)(config) actually will return
    return {
        messages: {
            byDevice: collectMessagesByDevice,
            byTopic: collectMessagesByTopic,
            byUser: collectMessagesByUser
        }
    };
};
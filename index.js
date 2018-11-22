const fs = require('fs'),
    convert = require('./convert.js'),
    _ = require('lodash'),
    extend = require('extend'),
    request = require('request');

function handleConversion(collection, config) {
    var swaggerFileName = collection.swagger_file_name;
    var postmanFileName = collection.postman_file_name;
    var collectionUid = collection.collection_uid;
    var swaggerObject = JSON.parse(
        fs.readFileSync(swaggerFileName, 'utf8')
    );

    var conversionResult = convert(swaggerObject);

    downloadEnvironment(collection.environment_file_name, collection.environment_id, config.key);

    if(collectionUid) {
        downloadCollection(conversionResult, postmanFileName, collectionUid, config);
    } else {
        fs.writeFileSync(postmanFileName, JSON.stringify(conversionResult.collection, null, 2));
        if(upload){
            updateCollection(postmanFileName, collectionUid, config.key);
        }
    }
}

function downloadEnvironment(environmentFileName, environmentId, key) {
    var getOptions = {
        method: 'GET',
        url: 'https://api.getpostman.com/environments/' + environmentId,
        qs: {
            format: '2.1.0'
        },
        headers: {
            'Cache-Control': 'no-cache',
            'X-Api-Key': key,
            'Content-Type': 'application/json'
        },
        json: true
    };

    request(getOptions, function (error, response, environmentJson) {
        if (error) throw new Error(error);
        var json = JSON.stringify(environmentJson.environment, null, 2);
        fs.writeFileSync(environmentFileName, json);
    });
}

// postmanのcollectionデータをダウンロードしてmergeして保存
function downloadCollection(swaggerJson, postmanFileName, collection_uid, config) {
    var getOptions = {
        method: 'GET',
        url: 'https://api.getpostman.com/collections/' + collection_uid,
        qs: {
            format: '2.1.0'
        },
        headers: {
            'Cache-Control': 'no-cache',
            'X-Api-Key': config.key,
            'Content-Type': 'application/json'
        },
        json: true
    };

    request(getOptions, function (error, response, postmanJson) {
        if (error) throw new Error(error);
        swaggerJson.collection.event = extend(true, [], swaggerJson.collection.event, postmanJson.collection.event)
        delete swaggerJson.collection.variables
        swaggerJson.collection.variable = postmanJson.collection.variable.filter(function(value) {
            return value.key && !value.disabled;
        });
        var json = JSON.stringify(swaggerJson.collection, null, 2);
        fs.writeFileSync(postmanFileName, json);
        if(config.upload){
            updateCollection(postmanFileName, collection_uid, config.key);
        }
    });
}

function updateLocalCollection(postmanFileName, newFile) {
    fs.writeFileSync('./' + postmanFileName, JSON.stringify(newFile, null, 2));
    console.log('writing to ' + postmanFileName);
}

function updatePostman(newFileName, collection_uid, key) {
    var data = fs.readFileSync('./' + newFileName, 'utf8');

    var postmanAPIKey = key;

    var putOptions = {
        method: 'PUT',
        url: 'https://api.getpostman.com/collections/' + collection_uid,
        qs: {
            format: '2.1.0'
        },
        headers: {
            'Cache-Control': 'no-cache',
            'X-Api-Key': postmanAPIKey,
            'Content-Type': 'application/json'
        },
        body: JSON.parse(data),
        json: true
    };

    request(putOptions, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
    });
}

function updateCollection(newFileName, collection_uid, key) {

    var data = fs.readFileSync('./' + newFileName, 'utf8');

    var file = JSON.parse(data);
    file.info.id = collection_uid;
    file.info._postman_id = file.info.id;
    var newFile = {};
    newFile.collection = file;

    // ローカルのファイルをcollectionオブジェクトでラップしたものを保存。
    updateLocalCollection(newFileName, newFile);

    // postmanアプリにアップロードする。
    updatePostman(newFileName, collection_uid, key);
}

function convert_upload(config) {
    if(config && typeof config === 'object'){
        config.collections.forEach( function (collection) {
            handleConversion(collection, config);
        }.bind(config));
    } else {
        console.log("configファイルを設定してください。")
    }
}

swagger2postman = {
    convert_upload: convert_upload
}

module.exports = swagger2postman;

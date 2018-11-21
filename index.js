const fs = require('fs'),
    convert = require('./convert.js'),
    _ = require('lodash'),
    extend = require('extend'),
    request = require('request');

function handleConversion(originalFileName, newFileName, collection_uid, key, upload) {
    var swaggerObject = JSON.parse(
        fs.readFileSync(originalFileName, 'utf8')
    );

    var conversionResult = convert(swaggerObject);

    if(collection_uid && key) {
        downloadCollection(conversionResult, newFileName, collection_uid, key, upload);
    } else {
        fs.writeFileSync(newFileName, JSON.stringify(conversionResult.collection, null, 2));
        if(upload){
            updateCollection(newFileName, collection_uid, key);
        }
    }
}

// postmanのcollectionデータをダウンロードしてmergeして保存
function downloadCollection(swaggerJson, newFileName, collection_uid, key, upload){
    var getOptions = {
        method: 'GET',
        url: 'https://api.getpostman.com/collections/' + collection_uid,
        qs: {
            format: '2.1.0'
        },
        headers: {
            'Postman-Token': '4122abb3-6098-6906-e172-49334961f595',
            'Cache-Control': 'no-cache',
            'X-Api-Key': key,
            'Content-Type': 'application/json'
        },
        json: true
    };

    request(getOptions, function (error, response, postmanJson) {
        if (error) throw new Error(error);
        swaggerJson.collection.event = extend(true, [], swaggerJson.collection.event, postmanJson.collection.event)
        swaggerJson.collection.variable = extend(true, [], swaggerJson.collection.variable, postmanJson.collection.variable)
        var json = JSON.stringify(swaggerJson.collection, null, 2);
        fs.writeFileSync(newFileName, json);
        if(upload){
            updateCollection(newFileName, collection_uid, key);
        }
    });
}

function updateLocalCollection(newFileName, newFile) {
    fs.writeFileSync('./' + newFileName, JSON.stringify(newFile, null, 2));
    console.log('writing to ' + newFileName);
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
            'Postman-Token': '4122abb3-6098-6906-e172-49334961f595',
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
            var config = this;
            var originalFileName = collection.from;
            var newFileName = collection.to;
            var collection_uid = collection.collection_uid;

            handleConversion(originalFileName, newFileName, collection_uid, config.key, config.upload);
        }.bind(config));
    } else {
        console.log("configファイルを設定してください。")
    }
}

swagger2postman = {
    convert_upload: convert_upload
}

module.exports = swagger2postman;

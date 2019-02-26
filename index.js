const fs = require('fs'),
    convert = require('./convert.js'),
    _ = require('lodash'),
    extend = require('extend'),
    request = require('request-promise');

function handleConversion(collection, config) {
    var swaggerFileName = collection.swagger_file_name;
    var postmanFileName = collection.postman_file_name;
    var collectionName = collection.collection_name;
    var environment_file_name = collection.environment_file_name;
    var environment_name = collection.environment_name;
    var upload = config.upload;

    var swaggerObject = JSON.parse(
        fs.readFileSync(swaggerFileName, 'utf8')
    );

    var conversionResult = convert(swaggerObject);

    downloadEnvironment(environment_file_name, environment_name, config.key);

    var getOptions = {
        method: 'GET',
        url: 'https://api.getpostman.com/collections/',
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
    request(getOptions)
    .then(function (postmanJson) {
        var collections = postmanJson.collections;
        if (!collections) throw new Error("collections not found");
        collections = collections.filter(function(collection) {
            return collection.name == collectionName;
        });
        collections = collections.sort(function(a,b) {
            return a.id > b.id;
        });
        var collectionUid = collections[0].uid;
        if(collectionUid) {
            downloadCollection(conversionResult, postmanFileName, collectionUid, config);
        } else {
            fs.writeFileSync(postmanFileName, JSON.stringify(conversionResult.collection, null, 2));
            if(upload){
                updateCollection(postmanFileName, collectionUid, config.key);
            }
        }
    }).catch(function (error) {
        throw new Error("collections not found");
    });
}

function downloadEnvironment(environmentFileName, environmentName, key) {
    var getOptions = {
        method: 'GET',
        url: 'https://api.getpostman.com/environments/',
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

    request(getOptions)
    .then(function (environmentJson) {
        var environments = environmentJson.environments;
        if (!environments) throw new Error("environments not found");
        environments = environments.filter(function(environment) {
            return environment.name == environmentName;
        });
        environments = environments.sort(function(a,b) {
            return a.id > b.id;
        });
        var environmentUid = environments[0].uid;

        var getOptions = {
            method: 'GET',
            url: 'https://api.getpostman.com/environments/' + environmentUid,
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
        request(getOptions)
        .then(function (environmentJson) {
            var json = JSON.stringify(environmentJson.environment, null, 2);
            fs.writeFileSync(environmentFileName, json);
        }).catch(function (error) {
            throw new Error("environment not found");
        });
    }).catch(function (error) {
        throw new Error("environments not found");
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

    request(getOptions).then(function (postmanJson) {
        swaggerJson.collection.event = extend(true, [], swaggerJson.collection.event, postmanJson.collection.event);
        delete swaggerJson.collection.variables;
        swaggerJson.collection.variable = postmanJson.collection.variable.filter(function(value) {
            return value.key && !value.disabled;
        });
        var json = JSON.stringify(swaggerJson.collection, null, 2);
        fs.writeFileSync(postmanFileName, json);
        if(config.upload){
            updateCollection(postmanFileName, collection_uid, config.key);
        }
    }).catch(function (error) {
        throw new Error("collection download failed");
    });
}

function updateLocalCollection(postmanFileName, newFile) {
    fs.writeFileSync('./' + postmanFileName, JSON.stringify(newFile, null, 2));
    console.log('writing to ' + postmanFileName);
}

function updatePostman(newFileName, collection_uid, key) {
    var data = fs.readFileSync('./' + newFileName, 'utf8');
    var putOptions = {
        method: 'PUT',
        url: 'https://api.getpostman.com/collections/' + collection_uid,
        qs: {
            format: '2.1.0'
        },
        headers: {
            'Cache-Control': 'no-cache',
            'X-Api-Key': key,
            'Content-Type': 'application/json'
        },
        body: JSON.parse(data),
        json: true
    };

    request(putOptions).then(function (body) {
        console.log(body);
    }).catch(function (error) {
        throw new Error("update failed");
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
        console.log("configファイルを設定してください。");
    }
}

swagger2postman = {
    convert_upload: convert_upload
};

module.exports = swagger2postman;

// 開発時に利用
// convert_upload({
//     "collections": [
//         {
//             //campfireApi
//             "swagger_file_name": "***.json",  //swagger読み込み用ファイル.json
//             "postman_file_name": "***.json",   //postman書き出しファイル名
//             "environment_file_name": "***.json",  //"environment書き出しファイル名
//             "environment_name": "****",    //読み込むenvironment名
//             "collection_name": "***",     //読み込むcollection名"
//         },
//     ],
//     "key": "***********************", //postmanAPI_KEY
//     "upload": false // "postmanへのuploadフラグ"
// });

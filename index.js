const fs = require('fs'),
    convert = require('./convert.js'),
    _ = require('lodash'),
    request = require('request');

function handleConversion(originalFileName, newFileName) {
    var swaggerObject = JSON.parse(
        fs.readFileSync(originalFileName, 'utf8')
    );

    var conversionResult = convert(swaggerObject);

    fs.writeFileSync(newFileName, JSON.stringify(conversionResult.collection, null, 2));
    console.log('Converted ' + originalFileName + ' to ' + newFileName);

}

function updateLocalCollection(newFileName, newFile) {
    fs.writeFileSync('./' + newFileName, JSON.stringify(newFile, null, 2));
    console.log('writing to ' + newFileName);
}

function updatePostman(newFileName, collection_uid) {
    var data = fs.readFileSync('./' + newFileName, 'utf8');

    var postmanAPIKey = config.key;

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

function updateCollection(newFileName) {

    var data = fs.readFileSync('./' + newFileName, 'utf8');

    var file = JSON.parse(data);
    var coll = config.collections.find( function (coll) {
        return coll.to === newFileName;
    });

    file.info.id = coll.collection_id;
    file.info._postman_id = file.info.id;
    var newFile = {};
    newFile.collection = file;

    updateLocalCollection(newFileName, newFile);
    updatePostman(newFileName, coll.collection_uid);
}

function convert_upload(config) {
    if(config && typeof config === 'object'){
        config.collections.forEach( function (collection) {
            var originalFileName = collection.from;
            var newFileName = collection.to;

            handleConversion(originalFileName, newFileName);
            if(this.upload){
                updateCollection(newFileName);
            }
        }.bind(config)
        );
    } else {
        console.log("configファイルを設定してください。")
    }
}

module.exports = function (config) {
  return convert_upload(config);
};
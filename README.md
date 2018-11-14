#swaggerファイルをpostman設定ファイルに変換＋postmanにアップロード

###使用する際の前準備

以下の内容のconfig.jsファイルを作成し
```
module.exports = {
    "collections": [
        {
            "from": "xxxxx.json", //読み込むswaggerファイル名
            "to": "yyyy.json", //書き出すpostmanファイル名
            "collection_uid": "xxxxxxx-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", //コレクションのuid
            "collection_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" //コレクションのid
        },
        //複数のコレクションに対応する場合は同フォーマットで追記。
        {
            "from": "xxxxx_1.json",
            "to": "yyyy_2.json",
            "collection_uid": "xxxxxxx-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            "collection_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        }
    ],
    "key": "xxxxxxxxxxxx", //postmanのAPI_KEY
    "upload": true //アップロードするかどうか
};

```
以下のようなファイル(convert_upload.js)として設定して利用する。
```
const convert_upload = require('convert_upload'),
      config = require('./config.js');

convert_upload(config);
```

実行コマンド例

```
node convert_upload.js
```
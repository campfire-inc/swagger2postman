# swaggerファイルをpostman設定ファイルに変換＋postmanにアップロード

## 使用する際の前準備

### postmanAPI
https://docs.api.getpostman.com/?_ga=2.61941868.1709674798.1542076726-139298275.1540453845#api-reference

collection情報の取得は
https://docs.api.getpostman.com/?_ga=2.61941868.1709674798.1542076726-139298275.1540453845#8ca888b7-ef54-f3b4-312f-3f3e2e2cf04e
のGET All Collections,GET Single Collectionを参照

### postmanAPIKeyの登録
https://go.postman.co/integrations/services/pm_pro_api


### npmとしてインストールする場合

他のnpmにはpageckage.jsonに以下のようにして組み込む
```
...
"dependencies": {
    "swagger2postman": "https://github.com/campfire-inc/swagger2postman.git"
}
...
```


### configファイルの作成
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
const swagger2postman = require('swagger2postman'),
      config = require('./config.js');

swagger2postman.convert_upload(config);
```

実行コマンド例

```
node convert_upload.js
```

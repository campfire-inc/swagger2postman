var Collection = require('postman-collection').Collection,
  _ = require('lodash'),
  Helpers = require('./helpers.js'),
  Converter = null;

Converter = {
  collection: null,

  createCollectionStructure: function (swaggerData, tree) {
    for (var child in tree.children) {
      if (tree.children.hasOwnProperty(child)) {
        this.collection.items.add(
          Helpers.convertChildToItemGroup(swaggerData, tree.children[child])
        );
      }
    }
  },

  convert: function (json) {
    var result = {
        status: true,
        collecion: null,
        reason: null
      },
      parseResult,
      swaggerData = {},
      tree;

    if (typeof json === 'string') {
      //parse
      parseResult = Helpers.parse(json);
      if (!parseResult.result) {
        throw new Exception('Invalid Swagger object');
      }
      json = parseResult.swagger;
    }

    swaggerData.globalConsumes = json.consumes || [];
    swaggerData.globalProduces = json.produces || [];

    // ポストマンの環境変数で変更できるbasePathにする。
    swaggerData.basePath = "{{scheme}}://{{host}}{{basePath}}/";
    swaggerData.baseParams = json.parameters;

    swaggerData.securityDefs = json.securityDefinitions;
    swaggerData.sampleDefinitions = json.definitions;
    swaggerData.sampleResponses = json.responses; 

    this.collection = new Collection();
    this.collection.name = json.info.title;
    this.collection.describe(json.info.description);
    this.collection.variables = _.map(swaggerData.sampleDefinitions);

    tree = Helpers.getTreeFromPaths(json);
    this.createCollectionStructure(swaggerData, tree);

    result.collection = this.collection.toJSON();

    return result;
  }
};

module.exports = function (json) {
  return Converter.convert(json);
};

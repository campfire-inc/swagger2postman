var ItemGroup = require('postman-collection').ItemGroup,
  Item = require('postman-collection').Item,
  Request = require('postman-collection').Request,
  Response = require('postman-collection').Response,
  RequestBody = require('postman-collection').RequestBody,
  url = require('url'),
  yaml = require('js-yaml'),
  schemaFaker = require('json-schema-faker'),
  _ = require('lodash');

schemaFaker.option({
  requiredOnly: false
});

module.exports = {
  getParamsForPathItem: function (swaggerData, paramArray) {
    var retVal = {},
      i,
      j,
      lenI,
      lenJ,
      parts,
      lastPart,
      paramGroup,
      getBaseParam;

    for (i = 0, lenI = paramArray.length; i < lenI; i++) {
      paramGroup = paramArray[i];
      if (paramGroup instanceof Array) {
        for (j = 0, lenJ = paramGroup.length; j < lenJ; j++) {
          if (paramGroup[j].$ref) {
            // this is a ref
            if (paramGroup[j].$ref.indexOf('#/parameters') === 0) {
              parts = paramGroup[j].$ref.split('/');
              lastPart = parts[parts.length - 1];
              getBaseParam = swaggerData.baseParams[lastPart];
              retVal[lastPart] = getBaseParam;
            }
          }
          else {
            retVal[paramGroup[j].name] = paramGroup[j];
          }
        }
      }
    }

    return retVal;
  },

  convertChildToItemGroup: function(swaggerData, child) {
    var thisItemGroup, thisItem, rCount, subChild, i, oneRequest;

    if (child.type === 'group') {
      if (child.requestCount > 1) {
        thisItemGroup = new ItemGroup({
          name: child.name
        });
        for (subChild in child.children) {
          if (child.children.hasOwnProperty(subChild)) {
            thisItemGroup.items.add(
              this.convertChildToItemGroup(swaggerData, child.children[subChild])
            );
          }
        }
        for (i = 0, rCount = child.requests.length; i < rCount; i++) {
          thisItemGroup.items.add(this.convertChildToItemGroup(swaggerData, child.requests[i]));
        }

        return thisItemGroup;
      }
      oneRequest = this.getSingleSwaggerRequestFromFolder(child);

      return this.convertSwaggerRequestToItem(swaggerData, oneRequest);
    }

    thisItem = this.convertSwaggerRequestToItem(swaggerData, child);

    return thisItem;

  },

  getSingleSwaggerRequestFromFolder: function (swaggerChild) {
    var childName;

    if (swaggerChild.requests.length > 0) {
      return swaggerChild.requests[0];
    }
    for (childName in swaggerChild.children) {
      if (swaggerChild.children.hasOwnProperty(childName)) {
        return this.getSingleSwaggerRequestFromFolder(swaggerChild.children[childName]);
      }
    }

    return null;
  },

  convertSwaggerRequestToItem: function (swaggerData, pathItem) {
    var rUrl,
      rName,
      rDataMode,
      rData = [],
      rHeaders = '',
      rPathVariables,
      rMethod = pathItem.method,
      request,
      requestBodyJSON,
      item,
      thisProduces, thisConsumes,
      path = pathItem.path,
      tempBasePath,
      param,
      hasQueryParams = false,
      thisResponses,
      thisResponse,
      thisResponseRef,
      thisResponseRefObject,
      operation = pathItem.request,
      pathParameters = pathItem.pathParameters,
      defaultVal,
      resCode,
      baseParams = swaggerData.baseParams,
      thisParams = this.getParamsForPathItem(swaggerData, [baseParams, operation.parameters, pathParameters]);

    if (path) {
      path = path.replace(/{/g, ':').replace(/}/g, '');
    }

    tempBasePath = swaggerData.basePath
      .replace(/{{/g, 'POSTMAN_VARIABLE_OPEN_DB')
      .replace(/}}/g, 'POSTMAN_VARIABLE_CLOSE_DB');

    rUrl = decodeURI(url.resolve(tempBasePath, path))
      .replace(/POSTMAN_VARIABLE_OPEN_DB/gi, '{{')
      .replace(/POSTMAN_VARIABLE_CLOSE_DB/gi, '}}');

    rName = operation.summary;

    thisProduces = operation.produces || swaggerData.globalProduces;
    thisConsumes = operation.consumes || swaggerData.globalConsumes;

    if (thisProduces.length > 0) {
      rHeaders += 'Accept: ' + thisProduces.join(', ') + '\n';
    }
    if (thisConsumes.length > 0) {
      rHeaders += 'Content-Type: ' + thisConsumes[0] + '\n';
    }

    _.each(operation.security, (security) => {
      for (var secReq in security) {
        if (security.hasOwnProperty(secReq)) {
          if (swaggerData.securityDefs[secReq] && (swaggerData.securityDefs[secReq].type === 'apiKey')) {
            thisParams.apiKey = swaggerData.securityDefs[secReq];
          }
        }
      }
    });

    for (param in thisParams) {
      if (thisParams.hasOwnProperty(param) && thisParams[param]) {

        defaultVal = '{{' + thisParams[param].name + '}}';
        if (thisParams[param].hasOwnProperty('default')) {
          defaultVal = thisParams[param].default;
        }

        if (thisParams[param].in === 'query') {
          if (!hasQueryParams) {
            hasQueryParams = true;
            rUrl += '?';
          }
          rUrl += thisParams[param].name + '=' + defaultVal + '&';
        }

        else if (thisParams[param].in === 'header') {
          rHeaders += thisParams[param].name + ': ' + defaultVal + '\n';
        }

        else if (thisParams[param].in === 'body') {
          rDataMode = 'raw';
          if (thisParams[param].schema) {
            thisParams[param].schema.definitions = _.assign(
              {},
              swaggerData.sampleDefinitions,
              thisParams[param].schema.definitions
            );
          }
          try {
            rData = schemaFaker(thisParams[param].schema);
          }
          catch (e) {
            rData = '// ' + JSON.stringify(thisParams[param].schema);
          }
          rHeaders += 'Content-Type: application/json\n';
        }

        else if (thisParams[param].in === 'formData') {
          if (thisConsumes.indexOf('application/x-www-form-urlencoded') > -1) {
            rDataMode = 'urlencoded';
          }
          else {
            rDataMode = 'formdata';
          }
          rData.push({
            'key': thisParams[param].name,
            'value': defaultVal,
            'type': 'text',
            'enabled': true
          });
        }
        else if (thisParams[param].in === 'path') {
          if (!rPathVariables) {
            rPathVariables = {};
          }
          rPathVariables[thisParams[param].name] = defaultVal;
        }
      }
    }

    request = new Request({
      method: rMethod,
      name: rName,
      url: rUrl,
      header: rHeaders
    });

    item = new Item({ name: rName });

    requestBodyJSON = {
      mode: rDataMode
    };

    if (rDataMode === 'formdata') {
      requestBodyJSON.formdata = rData;
    }
    else if (rDataMode === 'urlencoded') {
      requestBodyJSON.urlencoded = rData;
    }
    else {
      requestBodyJSON.raw = JSON.stringify(rData, null, 2);
    }
    request.body = new RequestBody(requestBodyJSON);


    thisResponses = operation.responses;

    for (resCode in thisResponses) {
      if (thisResponses.hasOwnProperty(resCode)) {
        thisResponse = thisResponses[resCode];
        if (thisResponse.$ref) {
          thisResponseRef = _.get(thisResponse.$ref.split('#/responses/'), '1');
          if (swaggerData.sampleResponses[thisResponseRef]) {
            thisResponseRefObject = swaggerData.sampleResponses[thisResponseRef];
            this.addResponsesFromSwagger(swaggerData, item, resCode, thisResponseRefObject);
          }
        }
        else {
          this.addResponsesFromSwagger(swaggerData, item, resCode, thisResponse);
        }
      }
    }

    item.request = request;

    return item;
  },

  isValidMethod: function (method) {
    return (method && (['get', 'post', 'put', 'patch', 'delete', 'head', 'options']).includes(method.toLowerCase()));
  },

  getTreeFromPaths: function (json) {
    var paths = json.paths,
      path,
      tree = {
        name: '/',
        requestCount: 0,
        children: {},
        type: 'group'
      },
      method,
      treeNode,
      thisPath,
      thisPathObject,
      thisPathCount,
      len,
      i;

    for (path in paths) {
      if (paths.hasOwnProperty(path)) {
        thisPathObject = paths[path];

        if (path[0] === '/') {
          path = path.substring(1);
        }

        thisPath = path.split('/');
        thisPathCount = Object.keys(thisPathObject).length; // =3
        len = thisPath.length;

        treeNode = tree;

        for (i = 0; i < len; i++) {
          if (!treeNode.children[thisPath[i]]) {
            treeNode.children[thisPath[i]] = {
              name: thisPath[i],
              requestCount: 0,
              children: {},
              requests: [],
              type: 'group'
            };
          }

          treeNode.children[thisPath[i]].requestCount += thisPathCount;
          treeNode = treeNode.children[thisPath[i]];
        }

        for (method in thisPathObject) {
          if (thisPathObject.hasOwnProperty(method) && this.isValidMethod(method)) {
            treeNode.requests.push({
              name: method,
              method: method,
              type: 'request',
              path: path,
              request: thisPathObject[method],
              pathParameters: (thisPathObject.parameters || [])
            });
          }
        }

      }
    }

    return tree;
  },

  addResponsesFromSwagger: function (swaggerData, item, resCode, swaggerResponse) {
    var postmanResponse,
      exampleMimeType,
      example;

    if (swaggerResponse.schema || swaggerResponse.headers || swaggerResponse.examples) {
      if (swaggerResponse.examples) {
        for (exampleMimeType in swaggerResponse.examples) {
          if (swaggerResponse.examples.hasOwnProperty(exampleMimeType)) {
            example = swaggerResponse.examples[exampleMimeType];

            postmanResponse = new Response();
            postmanResponse.name = swaggerResponse.description;
            if (typeof example === 'object') {
              postmanResponse.body = JSON.stringify(example);
            }
            else {
              postmanResponse.body = example;
            }

            if (exampleMimeType.includes('json')) {
              postmanResponse._postman_previewlanguage = 'json';
            }

            if (resCode !== 'default') {
              postmanResponse.code = parseInt(resCode) || 'Example';
            }

            if (swaggerResponse.headers) {
            }
            item.responses.add(postmanResponse);
          }
        }
      }
      else if (swaggerResponse.schema) {

        postmanResponse = new Response();
        postmanResponse.name = swaggerResponse.description;

        swaggerResponse.schema.definitions = _.assign(
          {},
          swaggerData.sampleDefinitions,
          swaggerResponse.schema.definitions
        );
        try {
          postmanResponse.body = JSON.stringify(schemaFaker(swaggerResponse.schema), null, 2);
        }
        catch (e) {
          postmanResponse.body = '// ' + JSON.stringify(swaggerResponse.schema);
        }
        if (resCode !== 'default') {
          postmanResponse.code = parseInt(resCode) || 'Example';
        }
        item.responses.add(postmanResponse);
      }

    }
    else {
      
    }
  },

  parse: function (jsonOrString) {
    var swaggerObj = jsonOrString;

    if (typeof jsonOrString === 'string') {
      try {
        swaggerObj = JSON.parse(jsonOrString);
      }
      catch (jsonEx) {
        try {
          swaggerObj = yaml.safeLoad(jsonOrString);
        }
        catch (yamlEx) {
          // Not JSON or YAML
          return {
            result: false,
            reason: 'The input must be valid JSON or YAML'
          };
        }
        // valid YAML
      }
    }

    // valid JSON

    // Check for everything that's required according to
    // https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md
    if (swaggerObj.swagger !== '2.0') {
      return {
        result: false,
        reason: 'The Swagger object must have the "swagger" property set to 2.0'
      };
    }
    if (!swaggerObj.info) {
      return {
        result: false,
        reason: 'The Swagger object must have an "info" property'
      };
    }
    if (!(swaggerObj.info.title && swaggerObj.info.version)) {
      return {
        result: false,
        reason: 'The info property must have title and version defined'
      };
    }
    if (!swaggerObj.paths) {
      return {
        result: false,
        reason: 'The Swagger object must have a "paths" property'
      };
    }

    // Valid. No reason needed
    return {
      result: true,
      swagger: swaggerObj
    };
  }
};

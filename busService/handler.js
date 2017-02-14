var request = require('request');
var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-west-1"
});

'use strict';


var docClient = new AWS.DynamoDB.DocumentClient();
var map = new Map();  		// used to keep track of primary keys
var table = "BroncoShuttleInfo";
var url = "https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info";


module.exports.fetch = (event, context, callback) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
    },
    body: JSON.stringify({
      message: 'Fetching bus times...',
    })
  };

  fetchBusInfo();
  callback(null, response);
};

module.exports.query = (event, context, callback) => {
  scanBusInfo(callback);
};



/* Retrieving Bus Information */
function fetchBusInfo() {
  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      for (var i = 0; i < body.length; i++) {
        storeItem(body[i]);     
      }
    }
  })
};

function storeItem(item) {
  // Create item
  var params = {
    TableName: table,
    Item: {
      "id": item.id,
      "timestamp": Date.now(),
      "logo": item.logo,
      "lat": item.lat,
      "lng": item.lng,
      "route": item.route
    }
  };

  // Store item to DynamoDB
  console.log("Attempting to add new item (id: " + item.id + ")");
  docClient.put(params, function(err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item to DynamoDB: ", item.id);
    }
  }); 
}


/* Scanning Bus Information */
function scanBusInfo(callback) {
  var params = {
    TableName : table
  };

  // Scan table in DynamoDB 
  docClient.scan(params, function(err, data) {
    if (err) {
      console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      if (callback) {
        const responseErr = {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
          },
          body: JSON.stringify({'err' : err}),
        };
        callback(null, responseErr);  
      }
    } else {
      console.log("Scan succeeded.");
      data.Items.forEach(function(item) {
      	// Use map to keep track of most current timestamp per item id
        if (map.has(item.id)) {
          // compare timestamps and store in map the one with the most current one
          var existingItem = map.get(item.id);
          if (item.timestamp > existingItem.timestamp) map.set(item.id, item);
        } else {
          map.set(item.id, item);
        }
      });
      if (callback) {
      	// Convert contents of map into an array for a json response
      	var items = Array.from(map.values());

        const responseOk = {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
          },
          body: JSON.stringify(items),
        };
        callback(null, responseOk);  
      }
    }
  })
}


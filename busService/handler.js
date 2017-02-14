var request = require('request');
var AWS = require('aws-sdk');

AWS.config.update({
  region: "us-west-1"
});

'use strict';


var docClient = new AWS.DynamoDB.DocumentClient();
var mostRecentTime;
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
      mostRecentTime = Date.now();
      for (var i = 0; i < body.length; i++) {
        storeItem(body[i], mostRecentTime);     
      }
      console.log("RECENTl",mostRecentTime);
    }
  })
};

function storeItem(item) {
  // Create item
  var logoURL;
  switch(item.route) {
    case 3164:
      logoURL = "https://github.com/IanStodart/CS499_Hackathon2/blob/master/A%20Icon.png?raw=true";
      break;
    case 4512:
      logoURL = "https://github.com/IanStodart/CS499_Hackathon2/blob/master/B1%20Icon.png?raw=true";
      break;
    case 4513:
      logoURL = "https://github.com/IanStodart/CS499_Hackathon2/blob/master/B2%20Icon.jpg?raw=true";
      break;
    case 4515:
      logoURL = "https://github.com/IanStodart/CS499_Hackathon2/blob/master/C%20Icon.png?raw=true";
      break;
  }
  var params = {
    TableName: table,
    Item: {
      "id": item.id,
      "timestamp": mostRecentTime,
      "logo": logoURL,
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
      console.log("Added item to DynamoDB: ", item);
    }
  }); 
}



/* Scanning Bus Information */
function scanBusInfo(callback) {
  fetchBusInfo();
  
  var params = {
    TableName : table,
    ProjectionExpression:"#id, logo, lat, lng, route",
    FilterExpression: "#timestamp = :time",
    ExpressionAttributeNames:{
    	"#id": "id",
        "#timestamp": "timestamp",
    },
    ExpressionAttributeValues: {
        ":time": mostRecentTime
    }
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
        console.log(item);
      });
      if (callback) {
        const responseOk = {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
          },
          body: JSON.stringify(data.Items),
        };
        console.log("RECENTl",mostRecentTime);
        console.log(data.Items);
        callback(null, responseOk);  
      }
    }
  })
}


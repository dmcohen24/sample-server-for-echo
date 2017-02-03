var express = require('express')
, app = express()
, server = require('http').createServer(app)
, port = process.env.PORT || 3000
, fs = require('fs')
, util = require('util');
, PubNub = require('pubnub');

var pubnub = new PubNub({
    subscribeKey: "sub-c-e3f96dde-ea58-11e6-a85c-0619f8945a4f",
    publishKey: "pub-c-13607f01-85f1-4659-8f11-dbdc3edd10f8",
    ssl: true
});

pubnub.addListener({
    
    message: function(m) {
        // handle message
        var channelName = m.channel; // The channel for which the message belongs
        var channelGroup = m.subscription; // The channel group or wildcard subscription match (if exists)
        var pubTT = m.timetoken; // Publish timetoken
        var msg = m.message; // The Payload
        
        if(channelName === 'echo_channel'){
            console.log('got message ' + msg + '!');
        }
    },
    status: function(s) {
        // handle status
    }
});
 
pubnub.subscribe({
    channels: ['echo_channel']
});

// Creates the website server on the port #
server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

// Express Routing
app.use(express.static(__dirname + '/public'));
app.engine('html', require('ejs').renderFile);

// Helper function to format the strings so that they don't include spaces and are all lowercase 
var FormatString = function(string)
{
  var lowercaseString = string.toLowerCase();
  var formattedString = lowercaseString.replace(/\s/g,'');
  return formattedString;
};

// Handles the route for echo apis
app.post('/api/echo', function(req, res){
  console.log("received echo request");
  var requestBody = "";

  // Will accumulate the data
  req.on('data', function(data){
    requestBody+=data;
  });

  // Called when all data has been accumulated
  req.on('end', function(){
    var responseBody = {};
    console.log(requestBody);
    console.log(JSON.stringify(requestBody));

    // parsing the requestBody for information
    var jsonData = JSON.parse(requestBody);
    if(jsonData.request.type == "LaunchRequest")
    {
      // crafting a response
      responseBody = {
        "version": "0.1",
        "response": {
          "outputSpeech": {
            "type": "PlainText",
            "text": "Welcome to Echo Sample! Please say a command"
          },
          "card": {
            "type": "Simple",
            "title": "Opened",
            "content": "You started the Node.js Echo API Sample"
          },
          "reprompt": {
            "outputSpeech": {
              "type": "PlainText",
              "text": "Say a command"
            }
          },
          "shouldEndSession": false
        }
      };
    }
    else if(jsonData.request.type == "IntentRequest")
    {
      var outputSpeechText = "";
      var cardContent = "";
      if (jsonData.request.intent.name == "TurnOn")
      {
        // The Intent "TurnOn" was successfully called
        outputSpeechText = "Congrats! You asked to turn on " + jsonData.request.intent.slots.Device.value + " but it was not implemented";
        cardContent = "Successfully called " + jsonData.request.intent.name + ", but it's not implemented!";
          
        // Publish turn on message
        pubnub.publish(
            {
                message: { device: jsonData.request.intent.slots.Device.value },
                channel: 'echo_channel',
            },
            function (status, response) {
                // handle status, response
                if (status.error) {
                    console.log(status)
                } else {
                    console.log("message Published with timetoken", response.timetoken)
                }
            }
        );
      }
      else if (jsonData.request.intent.name == "TurnOff")
      {
        // The Intent "TurnOff" was successfully called
        outputSpeechText = "Congrats! You asked to turn off " + jsonData.request.intent.slots.Device.value + " but it was not implemented";
        cardContent = "Successfully called " + jsonData.request.intent.name + ", but it's not implemented!";
      }else{
        outputSpeechText = jsonData.request.intent.name + " not implemented";
        cardContent = "Successfully called " + jsonData.request.intent.name + ", but it's not implemented!";
      }
      responseBody = {
          "version": "0.1",
          "response": {
            "outputSpeech": {
              "type": "PlainText",
              "text": outputSpeechText
            },
            "card": {
              "type": "Simple",
              "title": "Open Smart Hub",
              "content": cardContent
            },
            "shouldEndSession": false
          }
        };
    }else{
      // Not a recognized type
      responseBody = {
        "version": "0.1",
        "response": {
          "outputSpeech": {
            "type": "PlainText",
            "text": "Could not parse data"
          },
          "card": {
            "type": "Simple",
            "title": "Error Parsing",
            "content": JSON.stringify(requestBody)
          },
          "reprompt": {
            "outputSpeech": {
              "type": "PlainText",
              "text": "Say a command"
            }
          },
          "shouldEndSession": false
        }
      };
    }

    res.statusCode = 200;
    res.contentType('application/json');
    res.send(responseBody);
  });
});
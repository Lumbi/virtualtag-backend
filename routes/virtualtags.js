//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

var express = require('express');
var auth = require('basic-auth');
var Token = require('rand-token');
var User = require('../models/user');
var VirtualTag = require('../models/virtualtag');
var router = express.Router();

// VUFORIA
var Vuforia = require('vuforiajs');
var VuforiaClient = Vuforia.client({
    'accessKey': '',
    'secretKey': ''
});

/*
  Authenticate the user using HTTP Basic Authentication
*/
function authenticate(request, callback) {
  // Get Basic Auth credentials
  var creds = auth(request);

  // Check if credentials are defined
  if(!creds || !creds.pass) {
    callback(undefined, undefined);
    return;
  }

  // Find the users with the name from the credentials
  User.find({name: creds.name}, function(err, users){
    if(users && users.length > 0) {

      // Compare user's hashed and salted passwords
      users.forEach(function(user) {
        if(user.password === (User.hash(creds.pass, user.salt))) {
          callback(undefined, user);
        } else {
          callback(err, undefined);
        }
      });
    } else {
      callback(err, undefined);
    }
  });
}

// Utility function to format a JSON error message.
function errorMessage(message) {
  return JSON.stringify({error: message});
}

/*
  GET /virtualtags
*/
router.get('/', function(request, response) {

  console.log('GET ' + request.originalUrl);

  response.header("Content-Type", "application/json");
  authenticate(request,
    function(err, user) {
      if(user) {

        // Find all active Virtual Tags
        VirtualTag.find({ active: true }).populate('author').exec(
          function(err, virtualTags){
            if(!err){
              var results = [];
              var now = new Date();

              // Format each individual Virtual Tag for response
              virtualTags.forEach(function(v){
                if(now < v.exp_date) {
                  results.push({
                    id: v.id,
                    title: v.title,
                    author: { name: v.author.name },
                    location: v.location,
                    active: v.active,
                    exp_date: v.exp_date
                  });
                }
              });

              // Build the JSON response object
              var result = {
                virtual_tags: results,
                count: results.length
              };
              response.status(200).send(JSON.stringify(result));
            } else {
              response.status(500).send(errorMessage('Could not fetch VirtualTags from DB.'));
              console.log()
            }
        });
      } else {
        response.status(401).send(errorMessage('Invalid credentials'));
      }
    });
});

/*
  GET /virtualtags/:id
*/
router.get('/:id', function(request, response) {

  console.log('GET ' + request.originalUrl);

  response.header("Content-Type", "application/json");
  authenticate(request,
    function(err, user) {
      if (user) {

        // Find the requested Virtual Tag
        VirtualTag.findById(request.params.id,function(err, virtualTag) {

          // If the Virtual Tag was found
          if (virtualTag) {

            // Find the author
            User.findById(virtualTag.author,function(err, author) {
              // If for some reason there is no author, just return an empty object
              if (!author) author = { name: ''};

              // Build the response
              var responseBody = {
                virtual_tag: {
                  id: virtualTag.id,
                  title: virtualTag.title,
                  author: { id: author.id, name: author.name },
                  lines: virtualTag.lines,
                  size: virtualTag.size,
                  marker: virtualTag.marker,
                  location: virtualTag.location,
                  active: virtualTag.active,
                  exp_date: virtualTag.exp_date
                }
              };
              response.status(200).send(JSON.stringify(responseBody));
            });
          } else {
            response.status(404).send(errorMessage('Virtual Tag does not exist.'));
          }
        });
      } else {
        response.status(401).send(errorMessage('Invalid credentials'));
      }
    });
});

/*
  POST /virtualtags
*/
router.post('/', function(request, response) {

  console.log('POST ' + request.originalUrl);

  response.header("Content-Type", "application/json");
  authenticate(request,
    function(err, user) {
      if(user) {

        // Get the request Virtual Tag from the resquest's body
        var requestVirtualTag = request.body.virtual_tag;
        // Generate a dataset name
        requestVirtualTag.marker.dataset = Token.uid(16);

        // Check if the Virtual Tag contains all the information
        if(VirtualTag.isComplete(requestVirtualTag)) {
          var now = new Date();
          var expDate = new Date(); expDate.setDate(now.getDate()+7); // expires next week

          // Model the Virtual Tag that will be inserted into the DB
          var newVirtualTag = new VirtualTag({
            title: requestVirtualTag.title,
            author: user.id,
            lines: requestVirtualTag.lines,
            size: requestVirtualTag.size,
            marker: requestVirtualTag.marker,
            location : requestVirtualTag.location,
            active: true,
            exp_date: expDate
          });

          // Save the Virtual Tag to DB
          newVirtualTag.save(function(saveErr, createdVirtualTag){

            // If the save was successful
            if(!saveErr) {

              // Create the target for Vuforia
              var target = {
                'name': requestVirtualTag.marker.dataset,
                'width': requestVirtualTag.marker.size.width,
                'image': requestVirtualTag.marker.image_png_data,
                'active_flag': true,
                // 'application_metadata': util.encodeBase64('metadata')
              };

              // Add the target to Vuforia
              VuforiaClient.addTarget(target, function(error, result){
                if(!error) {
                  // Send back the created Virtual Tag's id to the client
                  var responseBody = {
                    created_virtual_tag_id: createdVirtualTag.id
                  };
                  response.status(200).send(JSON.stringify(responseBody));
                } else {
                  //
                  VirtualTag.findByIdAndRemove(createdVirtualTag.id).exec();
                  response.status(500).send(errorMessage('Could not upload Virtual Tag target to AR backend.'));
                  console.log(error);
                }
              });
            } else {
              response.status(500).send(errorMessage('Could not create Virtual Tag.'));
              console.log(saveErr);
            }
          });
        } else {
          response.status(400).send(errorMessage('Virtual Tag incomplete.'));
        }
      } else {
        response.status(401).send(errorMessage('Invalid credentials'));
      }
    });
});

/*
  DELETE /virtualtags/:id
*/
router.delete('/:id', function(request, response) {

  console.log('DELETE ' + request.originalUrl);

  response.header("Content-Type", "application/json");
  authenticate(request,
    function(err, user) {
      if(user) {

        // Find the Virtual Tag to delete
        VirtualTag.findById(request.params.id).populate('author').exec(function(err, virtualTag) {

          // If the Virtual Tag was found
          if(virtualTag) {

            // Make sure the user is the author of the Virtual Tag
            if(virtualTag.author.id === user.id) {

              // Remove the Virtual Tag
              VirtualTag.findByIdAndRemove(request.params.id, function(err, removedVirtualTag) {
                if(removedVirtualTag) {

                  // Remove the target from Vuforia WS
                  VuforiaClient.deleteTarget(removedVirtualTag.marker.dataset, function(err, result) {
                    if(!err) {
                      response.status(200).send();
                    } else {
                      response.status(500).send(errorMessage('Could not remove Virtual Tag target from AR backend.'));
                    }
                  });
                }
              });
            } else {
              response.status(403).send(errorMessage('Not author of this Virtual Tag.'));
            }
          } else {
            if(err) {
              response.status(500).send(errorMessage('Could not remove Virtual Tag from DB.'));
            } else {
              response.status(404).send(errorMessage('Virtual Tag does not exist.'));
            }
          }
        });
      } else {
        response.status(401).send(errorMessage('Invalid credentials'));
      }
    });
});

module.exports = router;

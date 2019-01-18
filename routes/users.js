//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

var express = require('express');
var Token = require('rand-token');
var User = require('../models/user');
var router = express.Router();

// Utility function to format a JSON error message.
function errorMessage(message) {
  return JSON.stringify({error: message});
}

/*
  POST /users
*/
router.post('/', function(request, response) {
  response.header("Content-Type", "application/json");

  requestUser = request.body;

  // Validate user name and password
  if(requestUser.name.length < 6 || requestUser.password.length < 6) {
    response.status(400).send(errorMessage('Name or password is too short.'));
    return;
  }

  // Check if user already exists
  User.findOne({name: requestUser.name}, function(err, user) {

    // If user already exists
    if(user) {
      response.status(409).send(errorMessage('Username already taken.'));
    } else {

      // Generate a salt for the new user
      var newSalt = Token.generate(16);

      // Build the new user model
      var newUser = new User({
        name: requestUser.name,
        password: User.hash(requestUser.password, newSalt),
        salt: newSalt
      });

      // Save the new user
      newUser.save(function(err) {
        if(!err) {
          response.status(200).send();
        } else {
          response.status(500).send(errorMessage('Could not create user'));
          console.log(err);
        }
      });
    }
  });
});

module.exports = router;

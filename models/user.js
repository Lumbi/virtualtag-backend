//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

var mongoose = require('mongoose');
var crypto = require('crypto');

var UserSchema = mongoose.model('User', new mongoose.Schema({
  name: String,
  password: String,
  salt: String
}));

UserSchema.hash = function(password, salt) {
  var hash = password;
  for(var i = 0; i < 3; i++) {
    var hasher = crypto.createHash('sha256');
    var saltedPassword = salt + hash;
    hasher.update(saltedPassword);
    hash = hasher.digest('hex');
  }
  return hash;
};

module.exports = UserSchema;

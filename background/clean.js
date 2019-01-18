//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

var Background = require('background');

// MONGOOSE
var VirtualTag = require('../models/virtualtag');

// VUFORIA
var Vuforia = require('vuforiajs');
var VuforiaClient = Vuforia.client({
    'accessKey': '',
    'secretKey': ''
});

module.exports = function(){
  var interval = 1000/*ms*/*60/*sec*/*60/*min*/;
  var cleanQueue = new Background.JobQueue(interval);

  // Expired Virtual Tag clean queue
  cleanQueue.push({

    // Every 'interval' milliseconds
    tick: function() {
      var now = new Date();

      // Find all expired Virtual Tags
      VirtualTag.find()
        .where('exp_date').lt(now)
        .remove()
        .exec(function(err, removedVirtualTags) {
          if(!err) {

            //TODO: !!! bug here, sometimes removedVirtualTags is not an array

            removedVirtualTags.forEach(function(removedVirtualTag) {

              // Also remove the target from Vuforia
              VuforiaClient.deleteTarget(removedVirtualTag.marker.dataset,
                function(err, result){
                  if(err) {
                    console.log('BACKGROUND ERROR: ' + err + ' ' + result);
                  }
              });
            });
          }
        });

      return false;
    },
    finish: function() {
      return false;
    }
  });
};

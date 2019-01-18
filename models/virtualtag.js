//
//  Created by Gabriel Lumbi on 2015-03-10.
//  Copyright (c) 2015 Gabriel Lumbi. All rights reserved.
//

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var VirtualTagSchema = mongoose.model('VirtualTag', new mongoose.Schema({
  title: String,
  author: { type: ObjectId, ref: 'User' },
  lines: [
    {
      line_color: { rgba: [Number,Number,Number,Number], _id: false },
      line_width: Number,
      points: [ { x: Number, y: Number, _id: false } ],
      _id: false
    }
  ],
  size: { width: Number, height: Number, _id: false },
  location: { latitude: Number, longitude: Number, _id: false },
  marker: {
    image_png_data: String,
    size: { width: Number, height: Number, _id: false },
    dataset: String,
    _id: false
  },
  active: Boolean,
  exp_date: Date
}));

VirtualTagSchema.isComplete = function(virtualTag)
{
  var result =
  virtualTag != undefined &&
  virtualTag.title != undefined &&
  virtualTag.lines != undefined &&
  virtualTag.size != undefined &&
  virtualTag.marker != undefined &&
  virtualTag.marker.image_png_data != undefined &&
  virtualTag.marker.size != undefined &&
  virtualTag.location != undefined;
  return result;
}

module.exports = VirtualTagSchema;

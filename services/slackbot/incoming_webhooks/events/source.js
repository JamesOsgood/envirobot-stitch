// This function is the webhook's request handler.
exports = function(payload, response) {
    body = EJSON.parse(payload.body.text());
    console.log( JSON.stringify(body) );
    if ( body.type == 'url_verification' )
    {
      return  { challenge : body.challenge };
    }


    if ( body.type == 'event_callback' )
    {
      text = body.event.text;
      var hello_index = text.toLowerCase().indexOf('hello');
      var stations_index = text.toLowerCase().indexOf('stations');
      var latest_index = text.toLowerCase().indexOf('latest');

      if ( hello_index  > 0 )
      {
        message = 'Hello from the bot, ' + text.substring( hello_index + 6);
        return context.functions.execute("send_slack_message", body.event.channel, message);
      }
      else if ( latest_index > 0)
      {
        station = text.substring(latest_index + 7);
        collection = context.services.get("mongodb-atlas").db("flood_data").collection("latest_data");
        if ( station.length > 0 )
        {
          return collection.findOne({'station.label' : station, 'measure.parameterName' : 'Water Level'}, { value : 1, dateTime : 1, _id : 0}).then( response => 
          {
            console.log(JSON.stringify(response));
            message = 'Water level at ' + station + ' is ' + response.value + ' as of ' + response.dateTime.toLocaleString();
            return context.functions.execute("send_slack_message", body.event.channel, message);
          });
        }
        else
        {
          return collection.find({}, { 'station.label' : 1, dateTime : 1, value : 1, _id : 0}).sort({'dateTime' : -1 }).limit(1).toArray().then( response => 
            {
            if ( response.length > 0 )
            {
              measure = response[0];
              message = 'Water level at ' + measure.station.label + ' is ' + measure.value + ' as of ' + measure.dateTime.toLocaleString();
              return context.functions.execute("send_slack_message", body.event.channel, message);
            }
          });
        }
      }
      else if ( stations_index > 0)
      {
        station = text.substring(stations_index + 9);
        collection = context.services.get("mongodb-atlas").db("flood_data").collection("latest_data");
        pipeline = [{
                '$match': {
                  'measure.parameterName': 'Water Level'
                }
              }, {
                '$group': {
                  '_id': '$station.label'
                }
              }, {
                '$sort': {
                  '_id': 1
                }
              }
            ];
        
        return collection.aggregate(pipeline).toArray().then( response => 
        {
          stations = [];
          for ( var i = 0; i < response.length; i++)
          {
            stations.push(response[i]._id);
          }
          
          message = stations.join(', ');
          return context.functions.execute("send_slack_message", body.event.channel, message);
        });
      }
    }
    else
    {
      return { "error" : 'Don"t understand', "body" : body };
    }
};
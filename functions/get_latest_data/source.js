exports = async function(arg)
{
    var http = context.services.get("flood_data_http");
		var url = "http://environment.data.gov.uk/flood-monitoring/data/readings?latest";

    // Get latest data from web service
		response = await http.get({url : url}); 
    // The response body is encoded as raw BSON.Binary. Parse it to JSON.
    const body = EJSON.parse(response.body.text());
    processed_items = [];
    for (var i = 0; i < body.items.length; i++)
    {
      var item = body.items[i];
      item._id = item.measure;
      item.measurement_id = item['@id'];
      item.dateTime = new Date(Date.parse(item.dateTime));
      delete item['@id'];
      processed_items.push(item);
    }
      
    // Write to mongo
    var collection = context.services.get("mongodb-atlas").db("flood_data").collection("latest_data_staging");
      
    await collection.deleteMany({});
    result = await collection.insertMany(processed_items);
    
    // Update materialised view
  	var pipeline_latest_data = [
    		{
    			'$lookup': {
    				'from': 'measures', 
    				'localField': 'measure', 
    				'foreignField': '_id', 
    				'as': 'measure'
    			}
    		}, {
    			'$unwind': {
    				'path': '$measure'
    			}
    		}, {
    			'$lookup': {
    				'from': 'stations', 
    				'localField': 'measure.station', 
    				'foreignField': '_id', 
    				'as': 'station'
    			}
    		}, {
    			'$unwind': {
    				'path': '$station'
    			}
    		}, {
    				'$merge': { 'into' : 'latest_data', 
    							'whenMatched' : 'replace' 
    				}
    			}
    	];
      		
    result = await collection.aggregate(pipeline_latest_data).toArray();

		pipeline_merge_historic = [
			{
				'$addFields': {
					'_id': '$measurement_id'
				}
			}, {
				'$project': {
					'measurement_id': 0
				}
			}, {
				'$merge': { 'into' : 'historic_data',
							'whenMatched' : 'keepExisting' 
				}
			}
		];
    
    result = await collection.aggregate(pipeline_merge_historic).toArray();
    return result;
}


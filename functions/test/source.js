exports = function(arg){
  var collection = context.services.get("mongodb-atlas").db("flood_data").collection("latest_data");
  return collection.find({}, { 'station.label' : 1, dateTime : 1, value : 1, _id : 0}).sort({'dateTime' : -1 }).limit(1).toArray().then( response => 
  {
    console.log(response.dateTime);
    console.log(JSON.stringify(response));
  });
};
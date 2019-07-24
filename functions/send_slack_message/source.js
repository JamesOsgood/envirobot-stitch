exports = function(channel, text){
    var slack_token = 'Bearer ' + context.values.get("slack_token");
    var chat = context.services.get("slack_chat");
    message_headers = { 'Content-Type' : ['application/json'], 'Authorization' : [slack_token] };
    response = { 'channel' : channel, 'text' : text };

    return chat.post({
        url: "https://slack.com/api/chat.postMessage",
        body: response,
        headers : message_headers,
        encodeBodyAsJSON: true
      })
      .then(response => {
        // The response body is encoded as raw BSON.Binary. Parse it to JSON.
        const ejson_body = EJSON.parse(response.body.text());
        return ejson_body;
      });
};
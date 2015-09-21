
var request = require('request');
var validUrl = require('valid-url');
//var parseString = require('xml2js').parseString;
var feed = require('feed-read');

module.exports = function(Rssfeed) {

	//Custom validation
	Rssfeed.validatesUniquenessOf(
		'url',
		{message: 'Conflicting url : already exisiting'}
	);
	Rssfeed.validatesUniquenessOf(
		'name',
		{message: 'Conflicting name : already exisiting'}
	);
	Rssfeed.validate(
		'url',		function (err) {
			if (!validUrl.isWebUri(this.url)) {
				err();
			}
		},
		{message: "Url is not a valid web uri"}
	);

	//Custom remote method
	Rssfeed.getData = function(id,cb) {

		function returnError(err) {
			cb(err, null);
		}

		function returnArticles(err, articles) {
			if (err) {
				console.log("Error parsing rss/atom feed.");
				returnError(
					{
						"error": 
							{
								"message" : 
								"Error parsing rss/atom feed."
							}
					}
				);
			}
			cb(null, articles);
		}

		Rssfeed.findById(id, function(err, instance){

			if (validUrl.isWebUri(instance.url)) {
				request(instance.url, function(error, response, body){
					if (!error && response.statusCode === 200) {

						var articles = null;
						var feedType = feed.identify(body);
						switch (feedType) {
							case "rss":
								feed.rss(body , returnArticles);
								break;
							case "atom":
								feed.atom(body, returnArticles);
								break;
							default:
								returnError({
									"error": 
										{
											"message" : 
												"Url is not a valid web uri"
										}
								});
						}

						// parseString(body, function (err, result) {
						// 	cb(null, result);
						// });
					} else {
						console.log("Error getting rss feed.");
						returnError(
							{ 
								"error": 
									{"message" : "Url is not a valid web uri"}
							}
						);
					}
				});
			} else {
				returnError(
					{ 
						"error":
							{"message" : "Url is not a valid web uri"}
					}
				);
			}
		});
	}

	Rssfeed.remoteMethod(
		'getData',
		{
			accepts: {arg: 'id', type: 'number', require: true},
			returns: {arg: 'rssFeedObj', type:'object', root: true},
			http: {path:'/:id/getdata', verb: 'get'}
		}
	);
};

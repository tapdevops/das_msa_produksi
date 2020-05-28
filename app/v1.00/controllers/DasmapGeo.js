// Modules
const GeoJSONPrecision = require('geojson-precision');
const axios = require('axios');
var request = require("request");
var geo_result = [];
var url_dasmap = config.app.url[config.app.env].dasmap;

// Parsing geojson standar ke kebutuhan mobile
function parseGeo(data){
	var data_geometry = GeoJSONPrecision.parse(data, 4);
	var results = [];
	if (data_geometry.features) {
		data_geometry.features.forEach(function (data, y) {
			var coordinates = data.geometry.coordinates;
			var coords = coordinates;
			
			var temporary_geometry = {};
			Object.keys(data.properties).forEach(function(key) {
				var val = data.properties[key];
				temporary_geometry[key] = (val == null) ? '' : val;
			});

			temporary_geometry['color'] = 'rgb(255, 255, 255)';
			temporary_geometry['coords'] = [];

			coords.forEach(function(coordinate, index) {
				// console.log(index);
				coordinate = coordinate[0];
				for (var i = 0; i < coordinate.length; i++) {
					for (var j = i + 1; j < coordinate.length;) {
						if (coordinate[i][0] == coordinate[j][0] && coordinate[i][1] == coordinate[j][1])
							// Found the same. Remove it.
							coordinate.splice(j, 1);
						else
							// No match. Go ahead.
							j++;
					}
				}

				temporary_geometry.coords[index] = [];
				coordinate.forEach(function (locs) {
					temporary_geometry.coords[index].push({
						longitude: locs[0],
						latitude: locs[1]
					});
				});
			});

			results.push(temporary_geometry);
		});

		return results
	}
	else {
		return false;
	}
}

// Get geojson untuk semua layer di peta
function getGeo(url, data, token, res) { 
	var now = data.length - 1;
	if(now == -1){
		var result = geo_result;
		geo_result = [];
		return res.json({
			status: true,
			message: "Success!",
			data: result
		});
	}

	if(data[now].type == 'tile'){
		axios.post(url.replace('{dataId}', data[now].dataId), token, {headers: { "Content-Type": "application/json" }})
		.then(function (response) {
			var new_token = {
				_csrfKey: response.data._csrfKey,
				_csrfToken: response.data._csrfToken
			}

			geo_result.push({
				name 	: data[now].name,
				color 	: data[now].rules[0].lineSymbolizer.stroke,
				geo		: parseGeo(response.data)
			});

			data.pop();
			getGeo(url, data, new_token, res);
		});
	}else{
		data.pop();
		getGeo(url, data, token, res);
	}
}

// get config peta dasmap berdasarkan id peta berupa geojson mobile
exports.parse_geojson = (req, res) => {
	var results = [];
	var key = '9d4298b9e8cd64f05383fc962c06c6d2';
	var data = {
		key : key
	}

	var options = { 
		method: 'POST',
		url: url_dasmap + '/user/index/token',
		headers: 
		{
			'Cache-Control': 'no-cache',
			'Content-Type': 'text/html; charset=UTF-8'
		},
		formData: data
	};

	try {
		// get token from key
		request(options, function (error, response, body) {
			console.log(error);
			if (error){
				return  res.status(501).send({
					status: false,
					message: "Gagal",
					data: error
				});
			}
			data = JSON.parse(body);
			data.account = 'admin';
			data.password = 'admin';
			
			// get authorization from dasmap
			axios.post(url_dasmap + '/api/user/login', data, {headers: { "Content-Type": "application/json" }})
			.then((response) => {
				data = {
					_csrfKey: response.data._csrfKey,
					_csrfToken: response.data._csrfToken
				}
				console.log('get user sukses');

				// get config in map based on map id
				axios.post(url_dasmap + '/api/iyo/map/'+req.query.peta, data, {headers: { "Content-Type": "application/json" }})
				.then((response) => {
					if(response.data.access == 'forbidden'){
						return res.status(501).send({
							status: false,
							message: "Gagal",
							data: response.data
						});
					}else if (response.data._csrfKey) {
						console.log('get layer sukses');
						var layers = JSON.parse(response.data.config).layers;
						data = {
							_csrfKey: response.data._csrfKey,
							_csrfToken: response.data._csrfToken
						}

						if(req.query.layer != undefined){
							layers = layers.filter(function (attr) { 
								return attr.name == req.query.layer;
							});
						}

						getGeo(url_dasmap + '/api/iyo/myrecords/{dataId}/1/1?format=geojson&limit=10000', layers, data, res);
					}else{
						return res.json({
							status: true,
							message: "Success!",
							data: response.data
						});
					}
				}).catch(err => {
					return res.status(501).send({
						status: false,
						message: "Gagal",
						data: err
					});
				});
			}).catch(err => {
				return res.status(501).send({
					status: false,
					message: "Gagal",
					data: err
				});
			});
		});
	}catch(err){
		return res.status(501).send( {
            status: false,
            message: err,
            data: []
        } );
	}
}
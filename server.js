/*
|--------------------------------------------------------------------------
| Global APP Init
|--------------------------------------------------------------------------
*/
process.env.ORA_SDTZ = 'UTC';
global._directory_base = __dirname;
global.config = {};
    config.app = require( './config/app.js' );
    config.database = require( './config/database.js' )[config.app.env];


/*
|--------------------------------------------------------------------------
| APP Setup
|--------------------------------------------------------------------------
*/
// Node Modules
const BodyParser = require( 'body-parser' );
const Express = require( 'express' );
const App = Express();

var fs = require('fs');
var moment = require('moment');


var socket  = require( 'socket.io' );
const cors = require('cors');
const axios = require('axios');
var request = require("request");

require('dotenv').config();

/*
|--------------------------------------------------------------------------
| APP Init
|--------------------------------------------------------------------------
*/
// Parse request of content-type - application/x-www-form-urlencoded
App.use( BodyParser.urlencoded( { extended: false } ) );

// Parse request of content-type - application/json
App.use( BodyParser.json() );

App.use(cors());


// Server Running Message
var Server = App.listen( parseInt( config.app.port[config.app.env] ), cors(), () => {
    console.log( 'Server' );
    console.log( "\tStatus \t\t: OK" );
    console.log( "\tService \t: " + config.app.name + " (" + config.app.env + ")" );
    console.log( "\tPort \t\t: " + config.app.port[config.app.env] );

    console.log("Database");
    console.log( "\tDB Server \t: " + config.database.connectString + " (" + config.app.env + ")" );
} );

// var server  = require('http').createServer(options, App);
var cron_job = [];

const oracledb = require('oracledb');
var cron = require('node-cron');
const ip = require('ip');

var io = socket.listen( Server );
io.origins('*:*');
io.set('origins', '*:*');

var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 10, // default = 10
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_NAME,
    timezone: 'utc+7'
});

var all_dashboard = [];

function init_socket(){
    try {
        io.on('connection', function (socket) {
            socket.on( 'update_chart', function( data ) {
                io.sockets.emit( 'update_chart', {
                    message: data 
                });
            });
        
            socket.on( 'refresh_cron', function( data ) {
                try {
                    console.log('refresh_cron');
                    var i = global.api.map(function(api) {
                        return api.name;
                    }).indexOf(data.name);
            
                    if(i == -1){
                        global.api.push(data);
                    }else{
                        if(cron_job[data.name] != undefined)
                            cron_job[data.name].destroy();
                        global.api[i] = data;
                    }
            
                    if(data.cron != null){
                        var q = new RegExp(/FROM[\n ]+[A-Z]+\.{1}[A-Z_0-9]+/g);
                        var mv = q.exec(data.query.toUpperCase())[0].replace('FROM', '').trim();
                        
                        cron_job[data.name] = cron.schedule(data.cron, () => {
                            refresh_mv(mv, data.id);
                        }, {
                            scheduled: true,
                            timezone: "Asia/Jakarta"
                        }); 
                    }
            
                    io.sockets.emit( 'refresh_cron', {
                        message: 'sukses'
                    });
            
                    // console.log(global.api);
                } catch (error) {
                    io.sockets.emit( 'refresh_error', {
                        message: error
                    });

                    reload_api();
                }
            });
        
            socket.on( 'delete_cron', function( data ) {
                try {
                    var ids = global.api.map(function(api) {
                        return api.id;
                    });
                    // console.log(ids, typeof(data));
                    var i = ids.indexOf(parseInt(data));
            
                    // console.log(i);
            
                    if(i == -1){
                        // global.push(data);
                    }else{
                        if(cron_job[global.api[i].name] != undefined)
                            cron_job[global.api[i].name].destroy();
                        global.api.splice(i, 1);
                    }
            
                    io.sockets.emit( 'delete_cron', {
                        message: 'sukses'
                    });
                } catch (error) {
                    reload_api();
                }
                // console.log(global.api, data);
            });
        
            socket.on( 'reload_cron', function( data ) {
                reload_api();
            });
        
            // socket.join('dashboard1');
        
            socket.on('dashboard', function(room) {
                socket.join(room.name);
            });
        
            socket.on('refresh_dashboard', function(){
                refresh_dashboard();
            });
        
            socket.on('current_page', function (param, fn) {
                try {
                    var dashboard = all_dashboard.filter(el => {
                        return el.id == param
                    })[0];
            
                    var page = Math.ceil( Math.ceil( 
                        ( 
                            (new Date().getHours() * 60 + new Date().getMinutes()) % 
                            (dashboard.pages * dashboard.interval_time)
                        ) 
                    ) / dashboard.interval_time);
                    
                    fn(((page == 0) ? dashboard.pages : page) -1);
                } catch (error) {
                    console.log(error, 'catch');
                }
            });
        
            // setInterval(function () { 
            //     socket.broadcast.to('dashboard1').emit( 'slide', (new Date().getHours() * 60 + new Date().getMinutes()) % 17);
            // }, 10 * 1000);
        });
    } catch (error) {
        init_socket();
    }
}

init_socket();

function refresh_dashboard(){
    pool.getConnection(function(err, connection) {
        connection.query(`
            select d.id , d.interval_time, d.reload_time , COUNT(dpm.id ) pages
            from dashboard d 
            join dashboard_page_map dpm on d.id = dpm.dashboard_id 
            GROUP by 1,2,3
        `, function (err, result, fields) {
            connection.release();
            if (err) throw err;
    
            all_dashboard = result;

            all_dashboard.forEach(dashboard => {
                if(cron.validate(dashboard.reload_time)){
                    // console.log(dashboard.reload_time);
                    cron_job['dashboard'+dashboard.id] = cron.schedule(dashboard.reload_time, () => {
                        // console.log('refresh');
                        io.sockets.in('dashboard'+dashboard.id).emit('refresh');
                    }, {
                        scheduled: true,
                        timezone: "Asia/Jakarta"
                    });
                }
            });
        });
    });
}

refresh_dashboard();

function slide_dashboard(){
    all_dashboard.forEach(dashboard => {
        var page = Math.ceil( 
            ( 
                (new Date().getHours() * 60 + new Date().getMinutes()) % 
                (dashboard.pages * dashboard.interval_time)
            ) 
        ) / dashboard.interval_time;
        io.sockets.in('dashboard'+dashboard.id).emit('slide', 
            ((page == 0) ? dashboard.pages : page) -1
        );
    });
}

cron_job['dashboard'] = cron.schedule('* * * * *', () => {
    // console.log('slide')
    slide_dashboard();
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
});

function save_lastdate(){
    var key = process.env.DASMAP_KEY;
	var data = {
		key : key
	}

    var url_dasmap = config.app.url[config.app.env].dasmap;
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
			if (body!=undefined){
                if (error){
                    return  response.status(501).send({
                        status: false,
                        message: "Gagal",
                        data: error
                    });
                }
                data = JSON.parse(body);
                data.account = process.env.DASMAP_USER;
                data.password = process.env.DASMAP_PASSWORD;
                
                // get authorization from dasmap
                axios.post(url_dasmap + '/api/user/login', data, {headers: { "Content-Type": "application/json" }})
                .then((response) => {
                    data = {
                        _csrfKey: response.data._csrfKey,
                        _csrfToken: response.data._csrfToken
                    }
                    console.log('get user sukses');

                    // get config in map based on map id
                    // console.log(url_dasmap + `/api/site/maps?term=(id = ${req.query.peta})`);
                    axios.post(url_dasmap + `/api/site/maps`, data, {headers: { "Content-Type": "application/json" }})
                    .then((response) => {
                        // console.log(response.data[0]);
                        if(response.data.access == 'forbidden'){
                            console.log('forbidden')
                            return res.status(501).send({
                                status: false,
                                message: "Gagal",
                                data: response.data
                            });
                        }else if (response.data._csrfKey) {
                            var petas = response.data;
                            Object.keys(petas).forEach( idx => {
                                var peta = petas[idx];
                                // console.log(peta.lastdate, peta.id);
                                pool.getConnection(function(err, connection) {
                                    connection.query("UPDATE company_dasmap_map set lastdate = ? where dasmap_id = ?", [peta.lastdate, peta.id], function (err, result, fields) {
                                        connection.release();
                                        if (err) throw err;
                                    });
                                });
                            });

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
                            data: JSON.stringify(err)
                        });
                    });
                }).catch(err => {
                    return res.status(501).send({
                        status: false,
                        message: "Gagal",
                        data: JSON.stringify(err)
                    });
                });
            }
		});
	}catch(err){
		return res.status(501).send( {
            status: false,
            message: err,
            data: []
        } );
	}
}

cron.schedule('0 0 1 * *', function (params) {
    save_lastdate();
}, {
    scheduled: true,
    timezone: "Asia/Jakarta"
})

// setInterval(function () { 
//     // io.sockets.emit('message', 'what is going on, party people?');
//     io.sockets.in('dashboard1').emit('slide', (new Date().getHours() * 60 + new Date().getMinutes()) % 17);
// }, 5 * 1000);

function insert_log(log) { 
    try {
        pool.getConnection(function(err, connection) {
            connection.query("insert into api_cron_logs(logs) values (?)", log, function (err, result, fields) {
                connection.release();
                if (err) throw err;
            });
        });
    } catch (err) {
        console.log('gagal insert log', err);
        insert_log(log);
    }
}

async function refresh_mv(mv, id){
    let log, connection, sql;
    // console.log(mv);
    try {
        let binds, options, result, connection;
        sql = `call dbms_mview.refresh('${mv}', 'C')`;
        connection = await oracledb.getConnection( config.database );
        binds = {};
        options = {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        };
        
        result = await connection.execute( sql, binds, options );
        // console.log(result, result == {}, result.length);
        log = `Sukses || ${sql} || ${new Date} || ${ip.address()}`;

        pool.getConnection(function(err, connection) {
            connection.query("update api set last_job_time = CURRENT_TIMESTAMP where id = (?)", id, function (err, result, fields) {
                connection.release();
                if (err) throw err;
            });
        });
    } catch ( err ) {
        console.log(err, 'refresh mv');
        log = `Gagal || ${sql} || ${new Date} || ${ip.address()} || ${err}`;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err, 'refresh mv 2');
            }
        }
    }

    insert_log(log);
}

function reload_api(){
    try {
        pool.getConnection(function(err, connection) {
            connection.query("SELECT * FROM api", function (err, result, fields) {
                connection.release();
                if (err) throw err;
                if(result.length > 0){
                    global.api = result;

                    global.api.forEach(element => {
                        if(cron.validate(element.cron)){
                            var q = new RegExp(/FROM[\n ]+[A-Z]+\.{1}[A-Z_0-9]+/g);
                            console.log(element.name);
                            // console.log(q.exec(element.query.toUpperCase()).slice(0, 1)[0])
                            try {
                                var mv = q.exec( element.query.toUpperCase().replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, " ") )[0].replace('FROM', '').trim();
                                // console.log(cron_job[element.name]);
                                if(cron_job[element.name] != undefined){
                                    cron_job[element.name].destroy();
                                }

                                cron_job[element.name] = cron.schedule(element.cron, () => {
                                    refresh_mv(mv, element.id);
                                }, {
                                    scheduled: true,
                                    timezone: "Asia/Jakarta"
                                });
                            } catch (error) {
                                console.log(q.exec( element.query.toUpperCase() ));
                            }
                            
                        }
                    });
                }else {
                    console.log('reload api');
                    io.sockets.emit( 'refresh_error', {
                        message: 'no api'
                    });
                    reload_api();
                }
            });
        });
    }catch (err) {
        console.log(err, 'reload api');
        io.sockets.emit( 'refresh_error', {
            message: err
        });
        reload_api();
    }

    console.log('finish');
}

reload_api();
save_lastdate();

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

App.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

require( './routes/api.js' )( App );
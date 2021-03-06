const oracledb = require('oracledb');
var functions = require(_directory_base + '/app/libraries/function.js');
var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit : 10, // default = 10
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_NAME,
    timezone: 'utc+7'
});

exports.downloadPerawatan = async (req, res) => {
    var param = req.query.val;
    try {
        // console.log('try');
        var api =  global.api.filter(function(api) {
            return api.name == 'detailperawatan';
        });

        if(api.length > 0){
            var api_ = api[0];
            // run query to tap_dw
            var query = api_.query;
            if(param != undefined){
                if(query.toLowerCase().includes('where')){
                    query += ` AND `;
                }else{
                    query += ` WHERE `;
                }
                query += ` ${api_.where_column} LIKE '${param}%' `;
            }
            // console.log(query);
            var detail_perawatan = await functions.get(`
                ${query}
            `, res);

            var perawatan_new = [];
            
            var all_param = Array.from(new Set(detail_perawatan.map((item) => item.PARAMETER)));

            all_param.forEach(function(param){
                var jenis_perawatan = detail_perawatan.filter(function(data){
                    return data.PARAMETER == param;
                });
                // console.log(jenis_perawatan);
                var all_jenis = Array.from(new Set(jenis_perawatan.map((item) => item.JENIS_PERAWATAN)))
                // console.log(all_jenis);

                var perawatan = [];

                all_jenis.forEach(function(jenis){
                    var data = detail_perawatan.slice().filter(function (detail) { 
                        return (detail.PARAMETER == param && detail.JENIS_PERAWATAN == jenis);
                    });
                    data.forEach(function(v){ delete v.PARAMETER; delete v.JENIS_PERAWATAN });
                    perawatan.push({
                        'JENIS_PERAWATAN' : jenis,
                        'data' : data
                    });
                });

                perawatan_new.push({
                    'PARAMETER' : param,
                    'perawatan' : perawatan
                });
            });

            return res.send( {
                status: true,
                message: 'Success!!',
                data: perawatan_new
            } )
        }else {
            return res.status(404).send({
                status: false, 
                message: 'API not found',
                data: []
            });
        }
    } catch(err) {
        console.log(err)
        return res.status(501).send({
            status: false, 
            message: "Internal server error",
            data: err
        });
    }
}

exports.downloadAll = async (req, res) => {
    var result = {};
    var type = req.body.type;
    var comp = req.body.comp;
    try {
        pool.getConnection(function(err, connection) {
            connection.query("SELECT group_concat(map_type) tipe from map_type mt where menu = ?", type, async function (err, response, fields) {
                connection.release();
                if (err) throw err;

                result['mapcolor'] = await functions.get(`
                    SELECT PARAMETER AS "PARAMETER_2", PARAMETER_2 AS "PARAMETER", COMPANY_CODE, NAME, MAP_COLOR
                    FROM ONECLICK.DAS_MAP_COLOR_MV
                    WHERE company_code = ${comp}
                    AND SUBSTR(PARAMETER, INSTR(PARAMETER, '||') + 2) IN (${response[0].tipe})
                `, res);

                result['detailpanen'] = await functions.get(`
                    SELECT "PARAMETER", "TYPE", MTD, YTD FROM ONECLICK.DAS_DETAIL_PANEN_MV
                    WHERE COMPANY_CODE = ${comp}
                `, res);
                
                if(type == 'PRD'){
                    
                }else {
                    
                }

                result['detailrotasipanen'] = await functions.get('SELECT * FROM ONECLICK.DAS_DET_ROTASI_PANEN_MV WHERE company_code = ' + comp, res);

                var detail_perawatan = await functions.get(`
                    SELECT PARAMETER,COMPANY_CODE,JENIS_PERAWATAN,MONTH,YEAR, ACTUAL, RECOMMEND,COLOR 
                    FROM ONECLICK.DAS_DETAIL_PERAWATAN_MV
                    WHERE COMPANY_CODE = '${comp}'
                `, res);

                var perawatan_new = [];
                

                var all_param = Array.from(new Set(detail_perawatan.map((item) => item.PARAMETER)));

                all_param.forEach(function(param){
                    var jenis_perawatan = detail_perawatan.filter(function(data){
                        return data.PARAMETER == param;
                    });
                    // console.log(jenis_perawatan);
                    var all_jenis = Array.from(new Set(jenis_perawatan.map((item) => item.JENIS_PERAWATAN)))
                    // console.log(all_jenis);

                    var perawatan = [];

                    all_jenis.forEach(function(jenis){
                        var data = detail_perawatan.slice().filter(function (detail) { 
                            return (detail.PARAMETER == param && detail.JENIS_PERAWATAN == jenis);
                        });
                        data.forEach(function(v){ delete v.PARAMETER; delete v.JENIS_PERAWATAN });
                        perawatan.push({
                            'JENIS_PERAWATAN' : jenis,
                            'data' : data
                        });
                    });

                    perawatan_new.push({
                        'PARAMETER' : param,
                        'perawatan' : perawatan
                    });
                });

                result['detailperawatan'] = perawatan_new;
                
                return res.send( {
                    status: true,
                    message: 'Success!!',
                    data: result
                } )
            });
        });
    } catch(err) {
        console.log(err)
        return res.status(501).send({
            status: false, 
            message: "Internal server error",
            data: err
        });
    }
}
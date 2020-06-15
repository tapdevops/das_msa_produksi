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

exports.downloadAll = async (req, res) => {
    var result = {};
    var type = 'PRD';
    var comp = '41';
    try {
        pool.getConnection(function(err, connection) {
            connection.query("SELECT group_concat(map_type) tipe from map_type mt where menu = ?", type, async function (err, response, fields) {
                connection.release();
                if (err) throw err;

                result['mapcolor'] = await functions.get(`
                    select "PARAMETER", PARAMETER_2, COMPANY_CODE, NAME, MAP_COLOR 
                    from RIZKI.DAS_MAP_COLOR_MV 
                    WHERE company_code = ${comp}
                    AND SUBSTR(PARAMETER, INSTR(PARAMETER, '||') + 2) IN (${response[0].tipe})
                `, res);
                if(type == 'PRD'){
                    result['detailrotasipanen'] = await functions.get('SELECT * FROM RIZKI.DAS_DET_ROTASI_PANEN_MV WHERE company_code = ' + comp, res);
                }else {
                    result['detailperawatan'] = await functions.get('SELECT * FROM RIZKI.DAS_DETAIL_PERAWATAN_MV WHERE company_code = 41' + comp, res);
                }
                
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
var functions = require(_directory_base + '/app/libraries/function.js');
require('dotenv').config()

exports.getAFD = async (req, res) => {
    let afd = req.params.afd;
    var query = `
        SELECT * FROM ${process.env.ORACLE_SCHEME}.DAS_AFD_PROGRES_TANAM_MV
        WHERE werks||AFDELING_CODE = '${afd}'
    `;
    functions.fetch(query, res);
}

exports.getBlok = async (req, res) => {
    let blok = req.params.blok;
    var query = `
        SELECT * FROM ${process.env.ORACLE_SCHEME}.DAS_BLOK_PROGRES_TANAM_MV
        WHERE werks||block_code = '${blok}'
    `;
    functions.fetch(query, res);
}

exports.getCompany = async (req, res) => {
    var comp = req.params.comp;
    var query = `
        SELECT * FROM ${process.env.ORACLE_SCHEME}.DAS_COM_PROGRES_TANAM_MV
        WHERE COMPANY_CODE = '${comp}'
    `;
    functions.fetch(query, res);
}

exports.getEstate = async (req, res) => {
    var werks = req.params.est;
    var query = `
        SELECT * FROM ${process.env.ORACLE_SCHEME}.DAS_EST_PROGRES_TANAM_MV
        WHERE WERKS = '${werks}'
    `;
    functions.fetch(query, res);
}
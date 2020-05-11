/*
 |--------------------------------------------------------------------------
 | Setup
 |--------------------------------------------------------------------------
 */
    //Controllers
    const Controllers = {
        v_1_0: {
            // Test : require( _directory_base + '/app/v1.00/controllers/Test.js' ),
            TV3 : require( _directory_base + '/app/v1.00/controllers/TV3.js' ),
            Panen : require( _directory_base + '/app/v1.00/controllers/Panen.js' ),
            AVT : require( _directory_base + '/app/v1.00/controllers/ActVSTarget.js' ),
            JT : require( _directory_base + '/app/v1.00/controllers/JumlahTonase.js' ),
            HK : require( _directory_base + '/app/v1.00/controllers/TonaseHK.js' ),
            PT : require( _directory_base + '/app/v1.00/controllers/ProgressTanam.js' ),
        }
    }

    const cors = require('cors');

    var corsOptions = {
        origin: function (origin, callback) {
            callback(null, true)	
        }
    }
        
    module.exports = ( app ) => {

        /*
        |--------------------------------------------------------------------------
        | Welcome Message
        |--------------------------------------------------------------------------
        */
            app.get( '/', ( req, res ) => {
                return res.json( { 
                    application: {
                        name : 'Microservice Dashboard Panen',
                        env : config.app.env,
                        port : config.app.port[config.app.env]
                    } 
                } )
            } );
            
        /*
        |--------------------------------------------------------------------------
        | Versi 1.0
        |--------------------------------------------------------------------------
        */
       
        // app.get( '/api/v1.00/test/:id', cors(corsOptions), Controllers.v_1_0.Test.getData );

        app.get( '/getCompany', cors(corsOptions), Controllers.v_1_0.TV3.getCompany );
        app.get( '/getRainfall/:werks', cors(corsOptions), Controllers.v_1_0.TV3.getRainfall );
        app.get( '/getYield/:werks', cors(corsOptions), Controllers.v_1_0.TV3.getYield );
        app.get( '/getBJR/:werks', cors(corsOptions), Controllers.v_1_0.TV3.getBJR );

        app.get( '/v1/dataprodbyblok/:blok', cors(corsOptions), Controllers.v_1_0.Panen.getBlok );
        app.get( '/v1/dataprodbyba/:ba', cors(corsOptions), Controllers.v_1_0.Panen.getBA );
        app.get( '/v1/dataprodbyafd/:afd', cors(corsOptions), Controllers.v_1_0.Panen.getAFD );

        app.get( '/v1/mapavtbyafd/:comp', cors(corsOptions), Controllers.v_1_0.AVT.getAFD );
        app.get( '/v1/mapavtbyblok/:comp', cors(corsOptions), Controllers.v_1_0.AVT.getBlok );
        app.get( '/v1/mapavtbycomp/:comp', cors(corsOptions), Controllers.v_1_0.AVT.getCompany );
        app.get( '/v1/mapavtbyest/:comp', cors(corsOptions), Controllers.v_1_0.AVT.getEstate );

        app.get( '/v1/jumlahtonasebyafd/:afd', cors(corsOptions), Controllers.v_1_0.JT.getAFD );
        app.get( '/v1/jumlahtonasebyblok/:blok', cors(corsOptions), Controllers.v_1_0.JT.getBlok );
        app.get( '/v1/jumlahtonasebycomp/:comp', cors(corsOptions), Controllers.v_1_0.JT.getCompany );
        app.get( '/v1/jumlahtonasebyest/:est', cors(corsOptions), Controllers.v_1_0.JT.getEstate );

        app.get( '/v1/tonasehkbyafd/:afd', cors(corsOptions), Controllers.v_1_0.HK.getAFD );
        app.get( '/v1/tonasehkbyblok/:blok', cors(corsOptions), Controllers.v_1_0.HK.getBlok );
        app.get( '/v1/tonasehkbycomp/:comp', cors(corsOptions), Controllers.v_1_0.HK.getCompany );
        app.get( '/v1/tonasehkbyest/:est', cors(corsOptions), Controllers.v_1_0.HK.getEstate );

        app.get( '/v1/progresstanambyafd/:afd', cors(corsOptions), Controllers.v_1_0.PT.getAFD );
        app.get( '/v1/progresstanambyblok/:blok', cors(corsOptions), Controllers.v_1_0.PT.getBlok );
        app.get( '/v1/progresstanambycomp/:comp', cors(corsOptions), Controllers.v_1_0.PT.getCompany );
        app.get( '/v1/progresstanambyest/:est', cors(corsOptions), Controllers.v_1_0.PT.getEstate );
    }

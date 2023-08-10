const express = require('express')
const authenticationController = require('./src/controllers/AuthenticationController')
const jetManualJobController = require('./src/controllers/JetManualJobController')

const app = express();

authenticationController.getBearerToken()
    .then(bearerToken => {
        if(bearerToken) {
            console.log('\nAuthorization Successful\n\nBearer Token:', bearerToken)
            jetManualJobController.startManualJob(bearerToken)
        }
        else {
            console.log('Authorization Failed\n')
        }
    })
    .catch(error => console.log('\nError while creating token:\n', error))

module.exports = app;
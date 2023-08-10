const config = require('config')
const jetManualJobService = require('../services/JetManualJobService.js')

const createJob = function(bearerToken) {
    console.log('\nStarting job creation process')
    return new Promise(function(resolve, reject) {
        jetManualJobService.createJob(bearerToken)
            .then(function (response) {
                resolve(response)
            })
            .catch(function (response) {
                reject(response)
            });
    })
}

const jetDeliveries = function(bearerToken, jobId) {
    console.log('\nStarting jet delivery process')
    return new Promise(function(resolve, reject) {
        jetManualJobService.jetDeliveries(bearerToken, jobId)
            .then(function (response) {
                console.log('Jet delivery response: \n', response)
                resolve(response)
            })
            .catch(function (response) {
                console.log('Error while initiating Jet Delivery: \n', response)
                reject(response)
            });
    })
}

exports.startManualJob = function(bearerToken) {
    const jobId = config.get('jetManualJobConfig.jobId')
    if(jobId) {
        jetDeliveries(bearerToken, jobId)
    }
    else {
        createJob(bearerToken)
            .then(createdJobResponse => {
                console.log('\nCreated Job Response:\n', createdJobResponse)
                if(createdJobResponse && createdJobResponse.jobId) {
                    jetDeliveries(bearerToken, createdJobResponse.jobId)
                }
             })
            .catch(error => console.log('\nError while creating Job:\n', error))
    }
}

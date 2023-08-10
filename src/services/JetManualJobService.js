const axios = require('axios');
const config = require('config')
const storageSourceFilesService = require('./StorageSourceFilesService.js')
const jetManualJobConfig = config.get('jetManualJobConfig')
const baseUrl = config.get('platformApiEndpoint') + '/v1/jobs'

const CREATE_JOB_ENDPOINT = '/';
const JET_DELIVERIES_ENDPOINT = '/${jobId}/deliveries';

/**
 * Builds payload required to create a new job. Need storage profile Id for both source and destination
 * Returns payload in JSON format
 **/
const newJobPayload = function() {
    const jobName = jetManualJobConfig.get('jobName') || 'Manual Job'
    const sourceStorageProfileId = jetManualJobConfig.get('sourceStorageProfileId') || ''
    const destinationStorageProfileId = jetManualJobConfig.get('destinationStorageProfileId') || ''

    const payload = {
        "name": jobName,
        "actions": [
            {
                 "type": "TRANSFER",
                 "data": {
                       "source": {
                         "storageProfileId": sourceStorageProfileId
                       },
                       "destination": {
                         "storageProfileId": destinationStorageProfileId
                       }
                 }
            }
        ]
    }

    return payload
}

/**
 * Creates a new job for the specified storage locations using the Jet API create job endpoint
 * Returns response with created job details
 **/
exports.createJob = function(bearerToken) {
    return new Promise(function(resolve, reject) {
        const payload = newJobPayload()
        console.log('\nRequest payload for creating new Job:\n', JSON.stringify(payload, undefined, 2))

        axios({
          method: 'POST',
          baseURL: baseUrl,
          url: CREATE_JOB_ENDPOINT,
          headers: { Authorization: bearerToken },
          data: payload
        })
        .then(response => {
            resolve(response.data)
        })
        .catch(error => {
            reject(error.response.data)
        })
    })
}

/**
 * Initiates the process to start a manual job using Jet API deliveries endpoint
 * Returns response with jet delivery details
 **/
const initiateJetDelivery = function(bearerToken, jobId, sourceFiles) {
    return new Promise(function(resolve, reject) {
        const jetDeliveryEndpoint = JET_DELIVERIES_ENDPOINT.replace("${jobId}", jobId)
        const objects = sourceFiles.map(({ lastModifiedOn, ...r }) => r);
        const payload = {
            "objects": objects
        }

        console.log('\nRequest payload for initiating Job:\n', JSON.stringify(payload, undefined, 2))

        axios({
          method: 'POST',
          baseURL: baseUrl,
          url: jetDeliveryEndpoint,
          headers: { Authorization: bearerToken },
          data: payload
        })
        .then(response => {
            resolve(response.data)
        })
        .catch(error => {
            reject(error.response.data)
        })
    })
}

/**
 * Fetch source files via Media Shuttle SDK and initiates the manual Jet job
 * Returns response with jet delivery details
 **/
exports.jetDeliveries = function(bearerToken, jobId) {
    return new Promise(function(resolve, reject) {
        storageSourceFilesService.getSourceFiles()
            .then(sourceFiles => {
                if(sourceFiles) {
                    console.log('\nList of source file(s) based on search criteria:\n',JSON.stringify(sourceFiles, undefined, 2))
                    if(sourceFiles.length > 0) {
                        initiateJetDelivery(bearerToken, jobId, sourceFiles)
                            .then(jetDeliveryResponse => {
                                resolve(jetDeliveryResponse)
                            })
                            .catch((error) => console.log(error))
                    }
                }
                else {
                    console.log('Source files not found\n')
                    resolve([])
                }
            })
            .catch((error) => console.log(error))
    })
}
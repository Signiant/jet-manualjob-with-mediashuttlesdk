const axios = require('axios');
const config = require('config')
const jetManualJobConfig = config.get('jetManualJobConfig')
const baseUrl = config.get('platformApiEndpoint')
const AUTHENTICATION_ENDPOINT = '/oauth/token';

/**
 * Generates an OAuth access token in JWT format, which is used by the `bearerAuth` authentication method
 * Returns bearer token response
 **/
exports.createToken = function() {
    return new Promise(function(resolve, reject) {
        const accessToken = jetManualJobConfig.get('access_token')
        if(accessToken) {
            resolve(accessToken)
        }
        else {
            const clientId = jetManualJobConfig.get('clientId')
            const clientSecret = jetManualJobConfig.get('clientSecret')

            axios({
              method: 'POST',
              baseURL: baseUrl,
              url: AUTHENTICATION_ENDPOINT,
              data: {
                "client_id": clientId,
                "client_secret": clientSecret,
                "grant_type": "client_credentials"
              }
            })
            .then(response => {
                if(response.data && response.data.token_type && response.data.access_token) {
                    const bearerToken = (response.data.token_type + ' ' + response.data.access_token)
                    resolve(bearerToken)
                }
                else {
                    resolve('')
                }
            })
            .catch(error => {
                reject(error.response.data)
            })
        }
    })
}
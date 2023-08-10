const authenticationService = require('../services/AuthenticationService.js')

exports.getBearerToken = function() {
    return new Promise(function(resolve, reject) {
        authenticationService.createToken()
            .then(function (response) {
                resolve(response)
            })
            .catch(function (response) {
                reject(response)
            });
    })
}
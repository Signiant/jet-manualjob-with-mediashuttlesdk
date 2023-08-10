const config = require('config')
const fs = require("fs")
const { join } = require('path')
require = require("esm")(module /*, options*/);
const MediaShuttleSDK = require('@signiant/media-shuttle-sdk')

const msSDKConfig = config.get('mediaShuttleSDKConfig')
const baseUrl = config.get('platformApiEndpoint')
const accountId = msSDKConfig.get('accountId')
const serviceId = msSDKConfig.get('serviceId')

const getExplorer = () => {
    const username = msSDKConfig.get('username')
    const password = msSDKConfig.get('password')
    const loginCredentials = new MediaShuttleSDK.LoginCredentials({ username, password })
    loginCredentials.baseUrl = baseUrl
    const resourceFactory = new MediaShuttleSDK.MediaShuttleResourceFactory(loginCredentials, { baseUrl, });
    return resourceFactory.getExplorer();
}

const explorer = getExplorer();

/**
 * Fetch portals via Media Shuttle SDK
 * Returns list of portals
 **/
async function getPortals() {
    console.log('\nGetting portals')
    try {
        const portals = await explorer.listPortals({accountId, serviceId})
        return portals
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Fetch permissions required to access the directory and sub folders associated with the portal storage location
 * Returns list of portals permissions
 **/
async function getPortalMemberPermissions(accountId, serviceId, portalId) {
    console.log('\nGetting portal permissions for portal: ', portalId)
    try {
        const portalPermissions = await explorer.getPortalMemberPermissions({accountId, serviceId, portalId})
        return portalPermissions
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Builds the source file payload in the required format for Jet Delivery
 * Returns the formatted source file
 **/
function buildSourceFileFormatForTransfer(path, sizeInBytes, lastModifiedOn) {
    const sourceFile = {
        "relativePath": path,
        "sizeInBytes": sizeInBytes,
        "lastModifiedOn": lastModifiedOn
    }

    return sourceFile
}

/**
 * Fetch the list of source files for all the folders and sub folders. Filters based on relativeFolderBrowsePath if provided in config
 * Returns response with the list of source files
 **/
async function getFolderContent(accountId, serviceId, portalId, folderId) {
    console.log('\nFinding source files')
    try {
        const relativeFolderBrowsePath = config.get('relativeFolderBrowsePath')
        const sourceFiles = await getFolderContentRecursively(accountId, serviceId, portalId, folderId, relativeFolderBrowsePath)
        return sourceFiles
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Recursively calls the getFolderContent method of Media Shuttle SDK to find the list of files based on the folderId or browsePath provided
 * Returns response with the cumulative list of source files
 **/
async function getFolderContentRecursively(accountId, serviceId, portalId, folderId, browsePath) {
    try {
        let sourceFiles = []
        async function getFiles(folderId, browsePath, sourceFiles) {
            const payload = { accountId, serviceId, portalId }
            if(browsePath) {
                payload.browsePath = browsePath
            }
            else {
                payload.folderId = folderId
            }

            let folderContent = await explorer.getFolderContent(payload)
            if(folderContent && folderContent.length > 0) {
                for(const file of folderContent) {
                    if(!file.isDirectory) {
                        const sourceFile = buildSourceFileFormatForTransfer(file.path, file.sizeInBytes, file.lastModifiedOn)
                        const includeSourceFile = includeSourceForManualJob(sourceFile)
                        if(includeSourceFile) {
                            sourceFiles.push(sourceFile)
                        }
                    }
                    else {
                        await getFiles(folderId, file.path, sourceFiles)
                    }
                }
            }

            return sourceFiles
        }
        const list = await getFiles(folderId, browsePath, sourceFiles)
        return list
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Finds the portal id either from config or from the list of portals based on provided portal name or portal URL
 * Returns response with the portalId
 **/
async function findPortalId() {
    const portalId = msSDKConfig.get('portalId')
    const portalURL = msSDKConfig.get('portalURL')
    const portalName = msSDKConfig.get('portalName')

    if(portalId) {
        return portalId
    }
    else if(portalURL || portalName) {
        const portals = await getPortals()
        if(portals && portals.length > 0) {
            const portal = portals.find(portal => (portal.url === portalURL) || (portal.name === portalName))
            if(portal && portal.portalId) {
                console.log('\nPortal Found: \n', portal)
                return portal.portalId
            }
        }
    }
}

/**
 * Source file is included in payload based on the inclusion/exclusion filters specified in the config
 * Returns true/false
 **/
const includeSourceForManualJob = function(sourceFile) {
    const inclusionFilters = config.get('filters.inclusions')
    const exclusionFilters = config.get('filters.exclusions')

    if(exclusionFilters) {
        const relativeFilePath = exclusionFilters['relativeFilePath']
        if(relativeFilePath) {
            const pattern = new RegExp(relativeFilePath);
            if(pattern.test(sourceFile.relativePath)) {
                return false
            }
        }
    }
    if(inclusionFilters) {
        const relativeFilePath = inclusionFilters['relativeFilePath']
        const lastModifiedBefore = inclusionFilters['lastModifiedBefore']

        if(relativeFilePath) {
            const pattern = new RegExp(relativeFilePath);
            if(!pattern.test(sourceFile.relativePath)) {
                return false
            }
        }
        if(lastModifiedBefore) {
            const fileLastModifiedDate = new Date(sourceFile.lastModifiedOn).getTime();
            const filterDate = new Date(lastModifiedBefore).getTime();

            if(fileLastModifiedDate > filterDate) {
                return false
            }
        }
    }

    return true
}

/**
 * Finds the list of source files by following step by step process as given below via Media Shuttle SDK
 * 1. Finds the portal id
 * 2. Finds the portal permissions based on the portal id
 * 3. Finds folder content recursively using folder id of home folder or browse path (if provided)
 * 4. Applies filters on the final list of source files
 * Returns response with the list source of files
 **/
async function getSourceFilesViaMediaShuttleSDK() {
    console.log('\nFinding source files via Media Shuttle SDK')
    try {
        const portalId = await findPortalId()

        if(portalId) {
            const portalPermissions = await getPortalMemberPermissions(accountId, serviceId, portalId)
            if(portalPermissions) {
                console.log('\nPortal Permissions:\n', JSON.stringify(portalPermissions, undefined, 2))
                const portalFolders = portalPermissions.folders;
                const homeFolder = portalFolders[0];

                if(homeFolder.id) {
                    const sourceFiles = await getFolderContent(accountId, serviceId, portalId, homeFolder.id)
                    return sourceFiles
                }
            }
            else {
                console.log('You do not have enough permissions to access source file(s) for portal: ',portalId)
            }
        }
        else {
            console.log('Portal not found to fetch the source file(s).')
        }
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Fetch the list of source files from the local file system for all the folders and sub folders. Filters based on relativeFolderBrowsePath provided in config
 * Returns response with the list of source files
 **/
async function getLocalSourceFiles() {
    try {
        const relativeFolderBrowsePath = config.get('relativeFolderBrowsePath')
        if(relativeFolderBrowsePath) {
            const sourceFiles = getLocalSourceFilesRecursively(relativeFolderBrowsePath)
            return sourceFiles
        }
        else {
            console.log('Please provide path for the source storage location.\n')
            return []
        }
    }
    catch (error) {
        console.log(error.message)
        return []
    }
}

/**
 * Recursively finds the list of files based on the directory specified
 * Returns response with the cumulative list of source files
 **/
const getLocalSourceFilesRecursively = (sourceStorageLocationPath) => {
    const sourceFiles = [];
    function getFiles(directory) {
        fs.readdirSync(directory).map(file => {
            const absolutePath = join(directory, file);
            const fileDetails = fs.statSync(absolutePath);
            if (fs.statSync(absolutePath).isDirectory()) {
                return getFiles(absolutePath);
            } else {
                let relativePath = '/'.concat(file)
                const sourceFile = buildSourceFileFormatForTransfer(relativePath, fileDetails.size, fileDetails.mtime)
                const includeSourceFile = includeSourceForManualJob(sourceFile)
                if(includeSourceFile) {
                    return sourceFiles.push(sourceFile);
                }
            }
        });
    }

    getFiles(sourceStorageLocationPath);
    return sourceFiles;
}

module.exports.getSourceFiles = (config.get('fetchSourceFilesViaMediaShuttleSDK')) ? getSourceFilesViaMediaShuttleSDK : getLocalSourceFiles
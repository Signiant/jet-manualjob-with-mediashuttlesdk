# Jet Manual Job App

A sample NodeJs application to retrieve the list of source files associated with the storage location and initiate the [Jet Manual Job](https://developer.signiant.com/jet/manual-jobs.html).
Source files can be fetched either by using [Media Shuttle SDK](https://developer.signiant.com/media-shuttle/media-shuttle-sdk.html) or by using local file system (via deploying the application locally to the storage).

### Source files retrieval via Media Shuttle SDK

- The configuration `fetchSourceFilesViaMediaShuttleSDK` needs to be true in `/config/default.json`
- Media Shuttle SDK finds the sources files associated with the given portal in the config.
- [Jet API](https://developer.signiant.com/jet/api-documentation.html) creates the job (if job id not given in config) and starts the manual job process resulting in the files transfer. 

### Source files retrieval via Local File System of storage location

- To retrieve source files via local file system, the application should be deployed locally to the storage location.
- The configuration `fetchSourceFilesViaMediaShuttleSDK` needs to be false in `/config/default.json`.
- The application will find the source files based on the `relativeFolderBrowsePath` in the config file which corresponds to the path of the source storage profile
- [Jet API](https://developer.signiant.com/jet/api-documentation.html)  creates the job (if job id not given in config) and starts the manual job process resulting in the files transfer.

## Getting Started

Clone this repo and install the application dependencies.

```
npm install
```

Start the application

```
npm start
```

## App configuration

The app makes requests and apply different filters based on the configuration defined in `/config/default.json`.

- `portalId` or `portalName` or `portalURL` - One of them needs to be provided in order to fetch the list of source files associated with the portal's storage location. The storage location should be same as the storage location of the source in case of Jet Manual Job.
- `relativeFolderBrowsePath` - Specific directory for which source files needs to be listed. If not provided (in case of Media Shuttle SDK), the app will find the list of source files based on root directory before applying filters. In case of local file system retrieval, relativeFolderBrowsePath needs to be provided.
- `jobId` - The manual job that needs to be started. If not provided, the app will create a new job and initiate the job delivery process based on the created job.
- `jobName` - Name of the manual job that needs to be created.
- `sourceStorageProfileId` - Storage profile id of the source storage location from where files need to be transferred.
- `destinationStorageProfileId` - Storage profile id of the destination storage location where files need to be transferred.
- `filters.inclusions` - All the given inclusion filters are applied to the list of source files before initiating the Jet Delivery.
- `filters.exclusions` - All the given exclusion filters are applied to the list of source files before initiating the Jet Delivery.
- `filters.inclusions.relativeFilePath` - Regex pattern or string for the relative path of the source file that needs to be included in the payload for Jet Delivery.
- `filters.exclusions.relativeFilePath` - Regex pattern or string for the relative path of the source file that needs to be excluded from the payload for Jet Delivery.
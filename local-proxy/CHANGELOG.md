# Change Log - @reshuffle/local-proxy

This log was last generated on Thu, 14 Nov 2019 14:26:29 GMT and should not be manually modified.

## 0.3.1
Thu, 14 Nov 2019 14:26:29 GMT

### Patches

- Add reshuffle-local-server helper script

## 0.3.0
Wed, 13 Nov 2019 14:35:01 GMT

### Minor changes

- Make server-function a peer dependency of local-proxy
- Use peer dependencies in local-proxy

## 0.2.18
Mon, 11 Nov 2019 09:47:52 GMT

*Version update only*

## 0.2.17
Thu, 07 Nov 2019 21:41:21 GMT

### Patches

- Do not load default babel config for backend transiplation

## 0.2.16
Thu, 07 Nov 2019 00:59:51 GMT

*Version update only*

## 0.2.15
Wed, 06 Nov 2019 01:12:56 GMT

### Patches

- Listen to DB requests on separate port
- Use express for default handler

## 0.2.14
Thu, 31 Oct 2019 10:35:06 GMT

### Patches

- Add logging to help debug user HTTP handler

## 0.2.13
Wed, 30 Oct 2019 06:22:03 GMT

### Patches

- Allow user to override local-proxy HTTP handler

## 0.2.12
Sun, 06 Oct 2019 15:54:01 GMT

### Patches

- Add error message on concurrent db open

## 0.2.11
Thu, 26 Sep 2019 15:16:00 GMT

*Version update only*

## 0.2.10
Wed, 25 Sep 2019 12:29:16 GMT

### Patches

- Add support for inserting initial data

## 0.2.9
Tue, 24 Sep 2019 14:19:38 GMT

*Version update only*

## 0.2.8
Mon, 23 Sep 2019 15:47:11 GMT

### Patches

- Use winston as logging library

## 0.2.7
Sun, 22 Sep 2019 12:17:20 GMT

### Patches

- Store all temporary files in .reshuffle dir

## 0.2.6
Mon, 16 Sep 2019 15:58:20 GMT

### Patches

- Rename "shift" ==> "reshuffle"

## 0.2.5
Sun, 15 Sep 2019 08:21:07 GMT

### Patches

- Prevent execution of unexposed functions

## 0.2.4
Wed, 11 Sep 2019 08:36:27 GMT

### Patches

- Load env from .env

## 0.2.3
Mon, 09 Sep 2019 10:48:16 GMT

*Version update only*

## 0.2.2
Mon, 09 Sep 2019 08:44:23 GMT

### Patches

- Allow access to non-JS files in backend directory
- Verify Host and Origin headers on local requests

## 0.2.1
Thu, 29 Aug 2019 12:31:30 GMT

*Version update only*

## 0.2.0
Wed, 28 Aug 2019 13:08:32 GMT

### Minor changes

- Use regular HTTP-based db client with an in-process LevelDB-based local server

### Patches

- Change DB ClientContext
- Update interfaces version
- Restore poll() functionality
- Fix db import
- Fix find()

## 0.0.14
Thu, 22 Aug 2019 15:45:43 GMT

### Patches

- Use upstream nodemon package

## 0.0.13
Wed, 21 Aug 2019 12:44:20 GMT

*Version update only*

## 0.0.12
Sun, 18 Aug 2019 14:34:51 GMT

### Patches

- Change invoke-server to use Koa

## 0.0.11
Tue, 13 Aug 2019 11:12:48 GMT

### Patches

- Use common code for serving decisions

## 0.0.10
Mon, 12 Aug 2019 13:45:13 GMT

*Version update only*

## 0.0.9
Fri, 09 Aug 2019 16:09:50 GMT

### Patches

- Generate source maps for transpiled backend sources

## 0.0.8
Tue, 06 Aug 2019 12:22:25 GMT

*Version update only*

## 0.0.7
Thu, 01 Aug 2019 12:37:42 GMT

### Patches

- Release packages publicly

## 0.0.6
Mon, 29 Jul 2019 06:11:31 GMT

### Patches

- Cleanup temp directories on Ctrl-C

## 0.0.5
Thu, 18 Jul 2019 12:48:13 GMT

### Patches

- Expose shift-db subscription functions
- Disallow requiring files outside of root dir

## 0.0.4
Tue, 09 Jul 2019 13:02:12 GMT

### Patches

- Downgrade AVA dependency

## 0.0.3
Tue, 09 Jul 2019 07:26:14 GMT

### Patches

- Use utilities from @babel/cli for code transpilation
- Don't fail npm test
- Use a dynamic port for the server child process
- Add logging to ~/.shiftjs/logs
- Add linting
- Limit distributed files

## 0.0.2
Fri, 21 Jun 2019 14:12:50 GMT

### Patches

- Fix error reporting for transpiling errors

## 0.0.1
Thu, 20 Jun 2019 15:03:42 GMT

### Patches

- Initial version


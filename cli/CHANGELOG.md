# Change Log - reshuffle

This log was last generated on Sun, 06 Oct 2019 12:16:51 GMT and should not be manually modified.

## 0.4.0
Sun, 06 Oct 2019 12:16:51 GMT

### Minor changes

- Measure stage timings during deploy

### Patches

- Download directly under CWD, not /tmp/.  Fixes issues on cross-device moves and writability of /tmp/.
- Error if package-lock.json not up-to-date with package.json.

## 0.3.2
Thu, 26 Sep 2019 15:16:00 GMT

### Patches

- Add download analytics
- Add support for logs by app name

## 0.3.1
Wed, 25 Sep 2019 13:21:31 GMT

### Patches

- Update spice client to exclude name from deployInitial

## 0.3.0
Tue, 24 Sep 2019 14:19:38 GMT

### Minor changes

- By default drop function deployment and invocation logs (use --all to restore).

### Patches

- Exclude code-transform package from upload
- Use download target dir

## 0.2.8
Mon, 23 Sep 2019 15:47:11 GMT

### Patches

- Show directory where app is deployed

## 0.2.7
Sun, 22 Sep 2019 12:17:20 GMT

### Patches

- Use reshuffle.com for default webpAppLoginUrl

## 0.2.6
Wed, 18 Sep 2019 09:05:39 GMT

### Patches

- Remove default path from config parameter
- Improve destroy command

## 0.2.5
Mon, 16 Sep 2019 15:58:20 GMT

### Patches

- Show suggestions without prompt
- Rename "shift" ==> "reshuffle"
- Download command use server side information

## 0.2.4
Sun, 15 Sep 2019 08:21:07 GMT

### Patches

- Use code-transform plugin on babel step

## 0.2.3
Thu, 12 Sep 2019 07:39:08 GMT

### Patches

- Use reshuffle domain

## 0.2.2
Wed, 11 Sep 2019 09:03:27 GMT

### Patches

- Don't generate README with oclif

## 0.2.1
Wed, 11 Sep 2019 08:36:27 GMT

### Patches

- Add initial component tests to CLI
- Diagnose bad server responses, avoid confusing Error dump
- Add dir->app selection for deploy
- Allow deploy from a path with spaces
- Fix deploy staging dir to use mkdtemp

## 0.2.0
Mon, 09 Sep 2019 08:44:23 GMT

### Minor changes

- Support custom config, destroy with no arg, list JSON format

### Patches

- Use shared subprocess code
- Deploy non-JS files in backend directory
- Add initial tests
- Add destroy app command
- Update dependecies
- Add user-agent to cli api requests

## 0.1.7
Wed, 04 Sep 2019 14:34:49 GMT

### Patches

- Add initial tests
- Add destroy app command
- Update dependecies

## 0.1.6
Mon, 02 Sep 2019 13:39:01 GMT

### Patches

- Extend CLI commands
- Add try and claim commands

## 0.1.5
Wed, 28 Aug 2019 13:08:32 GMT

### Patches

- Show clickable link to deployed app
- Update generated README.md
- Deploy less files
- Launch scripts with a shell on win32
- Add log limit constraints
- Update logs interfaces

## 0.1.4
Wed, 21 Aug 2019 12:44:20 GMT

### Patches

- Include db client in deploy

## 0.1.3
Sun, 18 Aug 2019 14:34:51 GMT

### Patches

- Fix parsing of base command flags
- Add logs command

## 0.1.2
Tue, 13 Aug 2019 16:51:10 GMT

### Patches

- Use proper tgz for deploy

## 0.1.1
Tue, 13 Aug 2019 14:08:52 GMT

### Patches

- Add deploy command

## 0.1.0
Tue, 13 Aug 2019 11:12:48 GMT

### Minor changes

- Add authentication flow

## 0.0.0
Thu, 08 Aug 2019 13:53:27 GMT

*Initial release*


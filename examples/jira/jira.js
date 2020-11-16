const { Reshuffle } = require('reshuffle')
const { JiraConnector } = require('reshuffle-jira-connector')

// This example uses reshuffle-jira-connector
// Code and documentation available on Github: https://github.com/reshufflehq/reshuffle-jira-connecto

const app = new Reshuffle()
const connector = new JiraConnector(app, {
  host: '<your-host.atlassian.net>',
  protocol: 'https',
  username: '<your user email address>',
  password: '<your api token>',
  baseURL: '<your runtime base url>',
})

connector.on({ jiraEvent: 'jira:issue_updated' }, (event, app) => {
  console.log(event.webhookEvent) // jira:issue_updated
  console.log(event.issue) // {"id":"10000","self":"https://reshuffle-demo.atlassian.net/rest/api/2/10000","key":"DEMO-1","fields":{"statuscategorychangedate":"2020-11-11T14:44:56.016+1300","issuetype":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issuetype/10001","id":"10001","description":"Functionality or a feature expressed as a user goal.","iconUrl":"https://reshuffle-demo.atlassian.net/secure/viewavatar?size=medium&avatarId=10315&avatarType=issuetype","name":"Story","subtask":false,"avatarId":10315},"timespent":null,"project":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/project/10000","id":"10000","key":"DEMO","name":"demo","projectTypeKey":"software","simplified":false,"avatarUrls":{"48x48":"https://reshuffle-demo.atlassian.net/secure/projectavatar?pid=10000&avatarId=10410","24x24":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=small&s=small&pid=10000&avatarId=10410","16x16":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=xsmall&s=xsmall&pid=10000&avatarId=10410","32x32":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=medium&s=medium&pid=10000&avatarId=10410"}},"fixVersions":[],"aggregatetimespent":null,"resolution":null,"customfield_10028":null,"resolutiondate":null,"workratio":-1,"lastViewed":"2020-11-10T15:25:02.313+1300","issuerestriction":{"issuerestrictions":{},"shouldDisplay":false},"watches":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issue/DEMO-1/watchers","watchCount":1,"isWatching":true},"created":"2020-11-10T15:25:02.104+1300","customfield_10020":null,"customfield_10021":null,"customfield_10022":null,"priority":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/priority/3","iconUrl":"https://reshuffle-demo.atlassian.net/images/icons/priorities/medium.svg","name":"Medium","id":"3"},"customfield_10023":null,"customfield_10024":null,"customfield_10025":null,"labels":[],"customfield_10016":null,"customfield_10017":null,"customfield_10018":{"hasEpicLinkFieldDependency":false,"showField":false,"nonEditableReason":{"reason":"PLUGIN_LICENSE_ERROR","message":"The Parent Link is only available to Jira Premium users."}},"customfield_10019":"0|hzzzzz:","timeestimate":null,"aggregatetimeoriginalestimate":null,"versions":[],"issuelinks":[],"assignee":null,"updated":"2020-11-11T14:44:56.015+1300","status":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/status/10001","description":"","iconUrl":"https://reshuffle-demo.atlassian.net/","name":"Selected for Development","id":"10001","statusCategory":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/statuscategory/2","id":2,"key":"new","colorName":"blue-gray","name":"New"}},"components":[],"timeoriginalestimate":null,"description":null,"customfield_10010":null,"customfield_10014":null,"timetracking":{},"customfield_10015":null,"customfield_10005":null,"customfield_10006":null,"customfield_10007":null,"security":null,"customfield_10008":null,"customfield_10009":null,"aggregatetimeestimate":null,"attachment":[],"summary":"Connect to Jira without pulling your hair","creator":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/user?accountId=5ed044d047d31e0c2a19ac39","accountId":"5ed044d047d31e0c2a19ac39","avatarUrls":{"48x48":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/48","24x24":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/24","16x16":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/16","32x32":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/32"},"displayName":"Christophe Gachiniard","active":true,"timeZone":"Pacific/Auckland","accountType":"atlassian"},"subtasks":[],"reporter":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/user?accountId=5ed044d047d31e0c2a19ac39","accountId":"5ed044d047d31e0c2a19ac39","avatarUrls":{"48x48":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/48","24x24":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/24","16x16":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/16","32x32":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/32"},"displayName":"Christophe Gachiniard","active":true,"timeZone":"Pacific/Auckland","accountType":"atlassian"},"aggregateprogress":{"progress":0,"total":0},"customfield_10000":"{}","customfield_10001":null,"customfield_10002":null,"customfield_10003":null,"customfield_10004":null,"environment":null,"duedate":null,"progress":{"progress":0,"total":0},"votes":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issue/DEMO-1/votes","votes":0,"hasVoted":false}}}
  console.log(event.changelog.items[0]) // {"field":"status","fieldtype":"jira","fieldId":"status","from":"3","fromString":"In Progress","to":"10001","toString":"Selected for Development"}
})

connector.on({ jiraEvent: 'jira:issue_created' }, (event, app) => {
  console.log(event.webhookEvent) // jira:issue_created
  console.log(event.issue) // {"id":"10001","self":"https://reshuffle-demo.atlassian.net/rest/api/2/10001","key":"DEMO-2","fields":{"statuscategorychangedate":"2020-11-11T14:44:56.016+1300","issuetype":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issuetype/10001","id":"10001","description":"Functionality or a feature expressed as a user goal.","iconUrl":"https://reshuffle-demo.atlassian.net/secure/viewavatar?size=medium&avatarId=10315&avatarType=issuetype","name":"Story","subtask":false,"avatarId":10315},"timespent":null,"project":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/project/10000","id":"10000","key":"DEMO","name":"demo","projectTypeKey":"software","simplified":false,"avatarUrls":{"48x48":"https://reshuffle-demo.atlassian.net/secure/projectavatar?pid=10000&avatarId=10410","24x24":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=small&s=small&pid=10000&avatarId=10410","16x16":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=xsmall&s=xsmall&pid=10000&avatarId=10410","32x32":"https://reshuffle-demo.atlassian.net/secure/projectavatar?size=medium&s=medium&pid=10000&avatarId=10410"}},"fixVersions":[],"aggregatetimespent":null,"resolution":null,"customfield_10028":null,"resolutiondate":null,"workratio":-1,"lastViewed":"2020-11-10T15:25:02.313+1300","issuerestriction":{"issuerestrictions":{},"shouldDisplay":false},"watches":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issue/DEMO-1/watchers","watchCount":1,"isWatching":true},"created":"2020-11-10T15:25:02.104+1300","customfield_10020":null,"customfield_10021":null,"customfield_10022":null,"priority":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/priority/3","iconUrl":"https://reshuffle-demo.atlassian.net/images/icons/priorities/medium.svg","name":"Medium","id":"3"},"customfield_10023":null,"customfield_10024":null,"customfield_10025":null,"labels":[],"customfield_10016":null,"customfield_10017":null,"customfield_10018":{"hasEpicLinkFieldDependency":false,"showField":false,"nonEditableReason":{"reason":"PLUGIN_LICENSE_ERROR","message":"The Parent Link is only available to Jira Premium users."}},"customfield_10019":"0|hzzzzz:","timeestimate":null,"aggregatetimeoriginalestimate":null,"versions":[],"issuelinks":[],"assignee":null,"updated":"2020-11-11T14:44:56.015+1300","status":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/status/10001","description":"","iconUrl":"https://reshuffle-demo.atlassian.net/","name":"Selected for Development","id":"10001","statusCategory":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/statuscategory/2","id":2,"key":"new","colorName":"blue-gray","name":"New"}},"components":[],"timeoriginalestimate":null,"description":null,"customfield_10010":null,"customfield_10014":null,"timetracking":{},"customfield_10015":null,"customfield_10005":null,"customfield_10006":null,"customfield_10007":null,"security":null,"customfield_10008":null,"customfield_10009":null,"aggregatetimeestimate":null,"attachment":[],"summary":"Connect to Jira without pulling your hair","creator":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/user?accountId=5ed044d047d31e0c2a19ac39","accountId":"5ed044d047d31e0c2a19ac39","avatarUrls":{"48x48":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/48","24x24":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/24","16x16":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/16","32x32":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/32"},"displayName":"Christophe Gachiniard","active":true,"timeZone":"Pacific/Auckland","accountType":"atlassian"},"subtasks":[],"reporter":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/user?accountId=5ed044d047d31e0c2a19ac39","accountId":"5ed044d047d31e0c2a19ac39","avatarUrls":{"48x48":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/48","24x24":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/24","16x16":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/16","32x32":"https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/5ed044d047d31e0c2a19ac39/405fd060-08c4-4bb1-8bdb-50af14e300dc/32"},"displayName":"Christophe Gachiniard","active":true,"timeZone":"Pacific/Auckland","accountType":"atlassian"},"aggregateprogress":{"progress":0,"total":0},"customfield_10000":"{}","customfield_10001":null,"customfield_10002":null,"customfield_10003":null,"customfield_10004":null,"environment":null,"duedate":null,"progress":{"progress":0,"total":0},"votes":{"self":"https://reshuffle-demo.atlassian.net/rest/api/2/issue/DEMO-2/votes"}}}
})

async function main() {
  const jiraProject = await connector.sdk().getProject('DEMO')
  console.log(jiraProject) // { self: 'https://<your-host.atlassian.net>/rest/api/2/project/10000', id: '10000', key: 'DEMO', description: 'desc', ...},

  const boards = await connector.sdk().getAllBoards()
  console.log(boards.values) // [{"id": 1, "self": "https://<your host name>.atlassian.net/rest/agile/1.0/board/1", "name": "DEMO board", ...}]

  const board1Issues = await connector.sdk().getIssuesForBoard(1)
  console.log(board1Issues.issues) // [{"id": "10000", "key": "DEMO-1","fields": {...}, ...}, ...]

  const user = await connector.sdk().getCurrentUser()
  console.log(user)
}

app.start()

main()
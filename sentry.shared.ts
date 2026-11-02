// SDK 11 collects user info, cookies, headers and bodies unless told otherwise. Users include
// minors' clinical and school records, so every init keeps SDK 10's restrictive defaults.
const sensitiveHeaders = { deny: ["forwarded", "-ip", "remote-", "via", "-user"] };

export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: sensitiveHeaders, response: sensitiveHeaders },
  httpBodies: [],
  urlQueryParams: sensitiveHeaders,
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};

import { got } from 'got';
import debugr from 'debug';

const debug = debugr('odk-central-api:auth');

const config = {
  serverUrl: process.env.ODK_CENTRAL_SERVER,
  userEmail: process.env.ODK_CENTRAL_WEB_EMAIL,
  userPassword: process.env.ODK_CENTRAL_WEB_PASSWORD,
};

let agent = generateAgentConfig();

function isLoggedIn(clientCfg) {
  return !!(clientCfg.defaults.options?.headers?.authorization);
}

export function setConfig(serverUrl, userEmail, userPassword) {
  config.serverUrl = serverUrl;
  config.userEmail = userEmail;
  config.userPassword = userPassword;
  agent = generateAgentConfig();
}

/**
 * @function generateAgentConfig
 *
 * @description
 * Regenerates a new agent configuration
 */
function generateAgentConfig() {
  return got.extend({
    prefixUrl: `${config.serverUrl}/v1/`,
    headers: { 'X-Extended-Metadata': true },
  });
}

async function getAuthorizationToken() {
  if (isLoggedIn(agent)) {
    return agent;
  }

  const parameters = {
    email: config.userEmail,
    password: config.userPassword,
  };

  debug(`Querying session on ${config.serverUrl}`);
  const response = await agent.post('sessions', { json: parameters }).json();

  debug(`Received: ${response}`);
  return response.token;
}

/**
 * @function client
 *
 * @description
 * Returns a fully configured got client to make queries against the
 * ODK Central API.
 *
 * @returns agent
 */
export async function client() {
  if (!isLoggedIn(agent)) {
    const token = await getAuthorizationToken();
    agent = agent.extend({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return agent;
}

/**
 * @function logout()
 *
 * @description
 * Logs a client out of an ODK Central session.
 */
export async function logout() {
  if (isLoggedIn(agent)) {
    const token = agent.defaults.options.headers.authorization.replace('Bearer ', '').trim();
    const response = await agent.delete(`sessions/${token}`).json();

    // replace the agent with a logged out one
    agent = got.extend({
      prefixUrl: `${config.serverUrl}/v1/`,
      headers: { 'X-Extended-Metadata': true },
    });

    return response;
  }
}

// try to load
process.nextTick(() => {
  generateAgentConfig(
    process.env.ODK_CENTRAL_SERVER,
    process.env.ODK_CENTRAL_WEB_EMAIL,
    process.env.ODK_CENTRAL_WEB_PASSWORD,
  );
});

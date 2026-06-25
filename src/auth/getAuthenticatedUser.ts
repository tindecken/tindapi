import { Context } from 'hono';

/**
 * Checks if a user is authenticated by examining the Hono context
 * @param c The Hono context object
 * @returns user infor if the user is logged in, null otherwise
 */
export const getAuthenticatedUserInfo = (c: Context) => {
  const user = c.get('user');
	if (user === null || user === undefined) {
    return null;
  }
  return user;
};

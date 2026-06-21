import { Context } from 'hono';

/**
 * Checks if a user is authenticated by examining the Hono context
 * @param c The Hono context object
 * @returns true if the user is logged in, false otherwise
 */
export const getAuthenticatedUserInfo = (c: Context) => {
  const user = c.get('user');
	if (user === null || user === undefined) {
    return null;
  }
  return user;
};

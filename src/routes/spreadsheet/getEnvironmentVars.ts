import { Hono } from "hono";
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';

export const getEnvironmentVars = new Hono<{ Bindings: Env }>();

getEnvironmentVars.get('/getEnvironmentVars', async (c) => {
  try {
	const res: GenericResponseInterface = {
	  success: true,
	  message: 'Retrieved current environments successfully',
	  data: {
		environment: c.env.ENVIRONMENT,
		SPREADSHEET_ID: c.env.SPREADSHEET_ID,
		GCP_SERVICE_ACCOUNT_EMAIL: c.env.GCP_SERVICE_ACCOUNT_EMAIL,
		GCP_PRIVATE_KEY: c.env.GCP_PRIVATE_KEY,
	  },
	};
	return c.json(res, 200);
  } catch (error: any) {
	const response: GenericResponseInterface = {
	  success: false,
	  message: error
		? `Error while retrieving current environments: ${error}${error.code ? ` - ${error.code}` : ""}`
		: "Error while retrieving current environments",
	  data: null,
	};
	return c.json(response, 500);
  }
})

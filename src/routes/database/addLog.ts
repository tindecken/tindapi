import { Hono } from "hono";
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import type { InsertLog } from '../../../drizzle/db/schema';
import { dbClient } from '../../../drizzle/db/dbclient';
import { logTable } from '../../../drizzle/db/schema';


export const addLog = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
  log: Type.String(),

})
addLog.post('/addLog', tbValidator('json', schema), async (c) => {
  try {
	const { id, log } = c.req.valid('json');

	const insertLog: InsertLog = {
		id,
		log,
	};

	await dbClient.insert(logTable).values(insertLog);

	const res: GenericResponseInterface = {
		success: true,
		message: 'Add log successfully.',
		data: null,
	};
	return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while add log: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while add log",
      data: null,
    };
    return c.json(response, 500);
  }
})

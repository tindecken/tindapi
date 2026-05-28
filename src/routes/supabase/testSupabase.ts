import { Hono } from "hono";
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { posts, secrets } from '../../../drizzle_supabase/migrations/schema';
import { eq, and, desc, sql } from "drizzle-orm";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js'
import { createDBClient } from "../../../drizzle_supabase/db/dbclient";

export const testSupabase = new Hono<{ Bindings: Env }>();

testSupabase.get('/test', async (c) => {
  try {
		const dbClient = createDBClient();
    const secretResult = await dbClient
      .select()
      .from(posts)
      .where(eq(posts.secretId, 142))

    if (secretResult.length === 0) {
      const res: GenericResponseInterface = {
        success: false,
        message: `Post "tindxxx" not found.`,
        data: null,
      };
      return c.json(res, 404);
    }
		console.log('secretResult', secretResult);


    const res: GenericResponseInterface = {
      success: true,
      message: 'Secret tinddaily retrieved successfully.',
      data: secretResult,
      totalRecords: secretResult.length,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while getting secret: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while getting secret",
      data: null,
    };
    return c.json(response, 500);
  }
});

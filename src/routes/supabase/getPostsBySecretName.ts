import { Hono } from "hono";
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { createDBClient } from '../../../drizzle_supabase/db/dbclient';
import { posts, secrets } from '../../../drizzle_supabase/migrations/schema';
import { eq, and, desc, sql } from "drizzle-orm";



export const getPostsBySecretName = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  secretName: Type.String(),
	limit: Type.Optional(Type.String({ pattern: '^[0-9]+$', default: '50' })),
  offset: Type.Optional(Type.String({ pattern: '^[0-9]+$', default: '0' })),
});

getPostsBySecretName.get('/getPostsBySecretName', tbValidator('query', schema), async (c) => {
  try {
		const dbClient = createDBClient();
    const { secretName, limit, offset } = c.req.valid('query');
		const limitNum = parseInt(limit ?? '50', 10);
    const offsetNum = parseInt(offset ?? '0', 10);
    // Find the secret by name
    const secretResult = await dbClient
      .select({ id: secrets.id })
      .from(secrets)
      .where(eq(secrets.name, secretName))
      .limit(1);

    if (secretResult.length === 0) {
      const res: GenericResponseInterface = {
        success: false,
        message: `Secret "${secretName}" not found.`,
        data: null,
      };
      return c.json(res, 404);
    }

    const secretId = secretResult[0].id;

    // Get total count of non-deleted posts for this secret
    const countResult = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(
        and(
          eq(posts.secretId, secretId),
          eq(posts.isDeleted, false)
        )
      );

    const totalRecords = countResult[0]?.count ?? 0;

    // Fetch posts
    const postsResult = await dbClient
      .select({
        id: posts.id,
        title: posts.title,
        text: posts.text,
        createdAt: posts.createdAt,
        updatedOn: posts.updatedOn,
        attachments: posts.attachments,
        uuid: posts.uuid,
      })
      .from(posts)
      .where(
        and(
          eq(posts.secretId, secretId),
          eq(posts.isDeleted, false)
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limitNum)
			.offset(offsetNum)

    const res: GenericResponseInterface = {
      success: true,
      message: 'Posts retrieved successfully.',
      data: postsResult,
      totalRecords,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while getting posts: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while getting posts",
      data: null,
    };
    return c.json(response, 500);
  }
});

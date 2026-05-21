import { Hono } from "hono";
import { tbValidator } from '@hono/typebox-validator'
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { dbClient } from '../../../drizzle_supabase/db/dbclient';
import { posts, secrets, configures } from '../../../drizzle_supabase/migrations/schema';
import { eq, and, gt, lt, sql } from "drizzle-orm";
import { getSupabaseStorageClient } from '../../utils/supabaseStorage';

export const createPost = new Hono<{ Bindings: Env }>();

const attachmentSchema = Type.Object({
  file: Type.String({ description: "Base64-encoded file content" }),
  fileName: Type.String({ description: "File name with extension, e.g. photo.png" }),
  contentType: Type.Optional(Type.String({ description: "MIME type, e.g. image/png" })),
});

const schema = Type.Object({
  secretName: Type.String(),
  title: Type.String(),
  text: Type.Optional(Type.String()),
  ipaddress: Type.String(),
  bucket: Type.Optional(Type.String({ default: "posts", description: "Supabase storage bucket name" })),
  attachments: Type.Optional(Type.Array(attachmentSchema)),
});

createPost.post('/createPost', tbValidator('json', schema), async (c) => {
  try {
    const body = c.req.valid('json');
    const { secretName, title, text, ipaddress, bucket, attachments } = body;

    // Find or create secret
    let secretResult = await dbClient
      .select({ id: secrets.id })
      .from(secrets)
      .where(eq(secrets.name, secretName))
      .limit(1);

    let secretId: number;

    if (secretResult.length === 0) {
      // Create new secret
      const insertResult = await dbClient
        .insert(secrets)
        .values({ name: secretName })
        .returning({ id: secrets.id });

      secretId = insertResult[0].id;
    } else {
      secretId = secretResult[0].id;
    }

    // Check max attachments per post
    const maxAttachmentsConfigure = await dbClient
      .select({ value: configures.value })
      .from(configures)
      .where(eq(configures.key, 'maxAttachmentsPerPost'))
      .limit(1);

    const maxAttachmentsPerPost = maxAttachmentsConfigure.length > 0
      ? Number(maxAttachmentsConfigure[0].value)
      : 10; // default

    if (attachments && attachments.length > maxAttachmentsPerPost) {
      const res: GenericResponseInterface = {
        success: false,
        message: `Max attachments per post: ${maxAttachmentsPerPost}`,
        data: null,
      };
      return c.json(res, 400);
    }

    // Check max post number per IP per day
    const isMaxReached = await isMaxPostNumberPerDayAsync(ipaddress);
    if (isMaxReached) {
      const maxPostsConfigure = await dbClient
        .select({ value: configures.value })
        .from(configures)
        .where(eq(configures.key, 'maxPostNumberPerIpPerDay'))
        .limit(1);

      const maxPosts = maxPostsConfigure.length > 0
        ? Number(maxPostsConfigure[0].value)
        : 30;

      const res: GenericResponseInterface = {
        success: false,
        message: `Max post number per IP per day: ${maxPosts}`,
        data: null,
      };
      return c.json(res, 429);
    }

    // Upload attachments to Supabase Storage
    let attachmentUrls: string[] = [];
    if (attachments && attachments.length > 0) {
      const supabase = getSupabaseStorageClient(c.env);
      const storageBucket = bucket ?? "posts";

      for (const att of attachments) {
        const decoded = Uint8Array.from(atob(att.file), (char) => char.charCodeAt(0));
        const storagePath = `sid${secretId}/${crypto.randomUUID()}-${att.fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(storagePath, decoded, {
            contentType: att.contentType ?? 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          const res: GenericResponseInterface = {
            success: false,
            message: `Attachment upload failed for "${att.fileName}": ${uploadError.message}`,
            data: null,
          };
          return c.json(res, 400);
        }

        attachmentUrls.push(storagePath ?? '');
      }
    }

    // Create post
    const insertResult = await dbClient
      .insert(posts)
      .values({
        secretId,
        title: title ?? null,
        text: text ?? null,
        ipaddress,
        attachments: attachmentUrls,
        isDeleted: false,
      })
      .returning({
        id: posts.id,
        secretId: posts.secretId,
        title: posts.title,
        text: posts.text,
        isDeleted: posts.isDeleted,
        ipaddress: posts.ipaddress,
        createdAt: posts.createdAt,
        attachments: posts.attachments,
        uuid: posts.uuid,
      });

    const res: GenericResponseInterface = {
      success: true,
      message: 'Post created successfully.',
      data: insertResult[0],
    };
    return c.json(res, 201);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while creating post: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while creating post",
      data: null,
    };
    return c.json(response, 500);
  }
});

async function isMaxPostNumberPerDayAsync(ipaddress: string): Promise<boolean> {
  const now = new Date();
  const startDateString = now.toISOString().split('T')[0] + 'T00:00:00.001Z';
  const endDateString = now.toISOString().split('T')[0] + 'T23:59:59.999Z';

  // Get max post number settings
  const maxPostsConfigure = await dbClient
    .select({ value: configures.value })
    .from(configures)
    .where(eq(configures.key, 'maxPostNumberPerIpPerDay'))
    .limit(1);

  const maxPostNumberPerIpPerDay = maxPostsConfigure.length > 0
    ? Number(maxPostsConfigure[0].value)
    : 30;

  // Get trusted IPs
  const trustedIpsConfigure = await dbClient
    .select({ value: configures.value })
    .from(configures)
    .where(eq(configures.key, 'trustedIps'))
    .limit(1);

  const trustedIps: string[] = trustedIpsConfigure.length > 0
    ? trustedIpsConfigure[0].value.split(',').map((ip: string) => ip.trim())
    : [];

  const maxTrustedConfigure = await dbClient
    .select({ value: configures.value })
    .from(configures)
    .where(eq(configures.key, 'maxPostNumberPerTrustedIpPerDay'))
    .limit(1);

  const maxPostNumberPerTrustedIpPerDay = maxTrustedConfigure.length > 0
    ? Number(maxTrustedConfigure[0].value)
    : 50;

  // Count posts for this IP today
  const countResult = await dbClient
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(
      and(
        eq(posts.ipaddress, ipaddress),
        gt(posts.createdAt, startDateString),
        lt(posts.createdAt, endDateString)
      )
    );

  const count = countResult[0]?.count ?? 0;

  if (trustedIps.includes(ipaddress)) {
    return count >= maxPostNumberPerTrustedIpPerDay;
  }

  return count >= maxPostNumberPerIpPerDay;
}

import { Hono } from "hono";
import { tbValidator } from '@hono/typebox-validator';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { getSupabaseStorageClient } from '../../utils/supabaseStorage';

export const uploadFile = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  bucket: Type.String(),
  path: Type.String(),
  file: Type.String({ description: "Base64-encoded file content" }),
  contentType: Type.Optional(Type.String()),
  upsert: Type.Optional(Type.Boolean({ default: false })),
});

uploadFile.post('/uploadFile', tbValidator('json', schema), async (c) => {
  try {
    const body = c.req.valid('json');
    const { bucket, path, file, contentType, upsert } = body;

    // Decode base64 to binary
    const decoded = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));

    const supabase = getSupabaseStorageClient(c.env);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, decoded, {
        contentType: contentType ?? 'application/octet-stream',
        upsert: upsert ?? false,
      });

    if (error) {
      const res: GenericResponseInterface = {
        success: false,
        message: `Upload failed: ${error.message}`,
        data: null,
      };
      return c.json(res, 400);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    const res: GenericResponseInterface = {
      success: true,
      message: 'File uploaded successfully.',
      data: {
        id: data.id,
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: urlData?.publicUrl ?? null,
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const res: GenericResponseInterface = {
      success: false,
      message: error?.message ?? 'Unexpected error during file upload.',
      data: null,
    };
    return c.json(res, 500);
  }
});

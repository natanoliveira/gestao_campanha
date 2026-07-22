import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "gestao-campanha";

export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${process.env.S3_PUBLIC_URL ?? ""}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn });
}

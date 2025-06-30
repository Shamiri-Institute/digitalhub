import sharp from "sharp";

import { DatabaseCommand } from "#/commands";
import { objectId } from "#/lib/crypto";
import { putObject } from "#/lib/s3";
import { FileModel } from "#/models/file";

interface UploadImageInput {
  /**
   * A publicly accessible URL to an image file.
   */
  url: string;
}

interface UploadImageOutput {
  /**
   * The id of the image file in the database.
   */
  id: string;
}

const ImageSize = 400;

export class UploadImageCommand extends DatabaseCommand<UploadImageInput, UploadImageOutput> {
  async perform(input: UploadImageInput) {
    // Download image from URL
    const imageResponse = await fetch(input.url);
    if (!imageResponse.ok) {
      throw new Error("Image download failed.");
    }
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Extract image metadata and resize
    const image = sharp(buffer);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Image metadata could not be extracted.");
    }

    const transformedImage = await image
      .resize({
        width: ImageSize,
        height: ImageSize,
      })
      .toBuffer();
    const transformedMetadata = await sharp(transformedImage).metadata();
    if (!transformedMetadata.size || !transformedMetadata.format) {
      throw new Error("Image metadata could not be extracted.");
    }

    // Generate object key
    const fileName = input.url.split("/").pop();
    if (!fileName) {
      throw new Error("Image file name could not be detected from URL.");
    }
    const fileId = objectId("file");
    const fileIdHash = fileId.slice(5);
    const objectKey = `${fileIdHash}-${fileName}`;

    // Upload image to S3
    const uploadResponse = await putObject({
      Body: transformedImage,
      Key: objectKey,
    });
    if (uploadResponse.$metadata.httpStatusCode !== 200) {
      throw new Error("Image upload failed.");
    }

    // Save file info to database
    const file = await new FileModel(this.db).create({
      id: fileId,
      key: objectKey,
      fileName: fileName,
      byteSize: transformedMetadata.size,
      contentType: transformedMetadata.format,
      width: transformedMetadata.width,
      height: transformedMetadata.height,
    });

    return { id: file.id };
  }
}

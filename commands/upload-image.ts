import sharp from "sharp";

import { DatabaseCommand } from "#/commands";
import { putObject } from "#/lib/s3";
import { objectId } from "#/lib/crypto";
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

const ImageSide = 400;

export class UploadImageCommand extends DatabaseCommand<
  UploadImageInput,
  UploadImageOutput
> {
  async perform(input: UploadImageInput) {
    // Download image from URL
    const imageResponse = await fetch(input.url);
    if (!imageResponse.ok) {
      throw new Error("Image download failed.");
    }
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    // Extract image metadata and resize
    let image = sharp(buffer);
    let metadata = await image.metadata();
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Image metadata could not be extracted.");
    }
    if (metadata.width < ImageSide || metadata.height < ImageSide) {
      console.error(input.url);
      throw new Error(
        `Image is too small. Minimum size is ${ImageSide}x${ImageSide}. Image size is ${metadata.width}x${metadata.height}.`
      );
    }

    const transformedImage = image.resize({
      width: ImageSide,
      height: ImageSide,
    });
    metadata = await transformedImage.metadata();
    if (!metadata.size || !metadata.format) {
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
      Body: await transformedImage.toBuffer(),
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
      byteSize: metadata.size,
      contentType: metadata.format,
      width: metadata.width,
      height: metadata.height,
    });

    return { id: file.id };
  }
}

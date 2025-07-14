export {
  /* @next-codemod-ignore - next-s3-upload@0.3.4 POST handler uses (req: NextRequest) => Promise<Response> signature, 
     compatible with Next.js 15. Static route /api/files/upload has no dynamic segments requiring params. */
  POST,
} from "next-s3-upload/route";

declare module "csv-parser" {
  const csvParser: any
  export default csvParser
}

declare module "multer" {
  const multer: any
  export default multer
}

declare global {
  namespace Express {
    interface Request {
      file?: any
      files?: any
    }
  }
}

export {}

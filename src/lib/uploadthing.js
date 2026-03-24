'use strict';

const { createUploadthing } = require('uploadthing/express');

const f = createUploadthing();

const ourFileRouter = {
  // Service cover image — max 4MB
  serviceCover: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      // Auth check — only admins
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('Unauthorized');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) throw new Error('Unauthorized');
      return { userId: decoded.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Package sub-service images — max 4MB, up to 5 files
  subServiceImages: f({ image: { maxFileSize: '4MB', maxFileCount: 5 } })
    .middleware(async ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('Unauthorized');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.userId) throw new Error('Unauthorized');
      return { userId: decoded.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
};

module.exports = { ourFileRouter };

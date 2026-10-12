import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  buckets: {
    uploads: { access: "private" },
    // Publicly readable, unauthenticated GETs. Holds assets that must load
    // without a credential — currently the branding images embedded in the
    // transactional emails (see docs/design/emails). Never put user content here.
    "public-assets": { access: "public_read" },
  },
});

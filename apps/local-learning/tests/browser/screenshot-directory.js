import { resolve } from "node:path";

export const screenshotDirectory = resolve(process.env.ATLAS_REVIEW_SCREENSHOTS_DIR ?? "/tmp/atlas-test-screenshots");

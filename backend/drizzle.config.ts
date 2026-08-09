import type { Config } from 'drizzle-kit';
import path from 'path';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${path.resolve(__dirname, 'teamflow.db')}`,
  }
} satisfies Config;


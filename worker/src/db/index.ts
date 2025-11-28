import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export const createDb = (env: Env) => {
  return drizzle(env.BOTSHOP_DB, { schema });
};

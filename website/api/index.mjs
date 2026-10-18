// Vercel entry: the whole API is one fetch handler, shared with backend/api/scripts/dev-server.mjs.
import { handle } from '../backend/api/lib/router.mjs';

export default { fetch: handle };

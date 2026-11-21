import { z } from 'zod';

// The Content-Security-Policy of the server doesn't allow `eval`, and Zod tries
// it to see whether it can compile the schemas. Turning that off keeps a
// security error out of the console. This module goes first in `main.tsx`,
// because the schemas read the setting when they are made.
z.config({ jitless: true });

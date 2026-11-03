/* Prints the press kit data (src/lib/pressKit.ts) as JSON for build.cjs. */
import * as kit from '../../src/lib/pressKit';

process.stdout.write(JSON.stringify(kit));

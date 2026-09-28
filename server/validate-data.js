import { loadData, validateData } from './data.js';

const summary = validateData(loadData());
process.stdout.write(`Data valid: ${JSON.stringify(summary)}\n`);

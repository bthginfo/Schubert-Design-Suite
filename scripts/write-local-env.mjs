import {writeFile} from 'node:fs/promises';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdout.write('Ready for private environment JSON on stdin (input hidden).\n');
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.includes('\n'))break;}
if(process.stdin.isTTY)process.stdin.setRawMode(false);
const values=JSON.parse(input.trim());
await writeFile('.env',Object.entries(values).filter(([,v])=>typeof v==='string'&&v).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join('\n')+'\n',{mode:0o600});
console.log(`Saved ${Object.keys(values).length} environment keys without displaying their values.`);

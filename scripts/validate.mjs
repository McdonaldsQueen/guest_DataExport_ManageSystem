import fs from 'node:fs';
import vm from 'node:vm';
for(const f of ['index.html','style.css','app.js','office.js','data.json'])if(!fs.existsSync('dist/'+f))throw Error('Missing '+f);
for(const f of ['app.js','priority-rules.js','processing.js','integration.js','priority-ui.js','xlsx-reader.js'])new vm.Script(fs.readFileSync('dist/'+f,'utf8'));
new vm.Script(fs.readFileSync('dist/office.js','utf8'));
const d=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
for(const key of ['units','guests','departments','districts','rules'])if(!Array.isArray(d[key]))throw Error('Invalid '+key);
const ids=new Set(d.units.map(u=>u.id));if(ids.size!==d.units.length)throw Error('Duplicate unit ids');
const guests=new Set();for(const g of d.guests){if(!ids.has(g.unitId)||guests.has(g.id))throw Error('Invalid guest identity/reference');guests.add(g.id);if(!['是','否','待定','空白'].includes(g.status))throw Error('Invalid attendance')}
console.log('Static assets, JavaScript syntax, JSON schema basics and stable IDs validated. Serve dist/ directly; no compilation required.');

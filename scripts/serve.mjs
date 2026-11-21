import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let part=decodeURIComponent(url.pathname);if(part.endsWith('/'))part+='index.html';const file=path.resolve(root,'.'+part);if(!file.startsWith(root+path.sep)||part.split('/').some(p=>p.startsWith('.')))throw Error('Forbidden');if(!(await stat(file)).isFile())throw Error('Not found');res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}}).listen(port,host,()=>console.log(`Guest workbench: http://${host}:${port}`));

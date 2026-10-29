const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const files={'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],'/logo.png':['logo.png','image/png']};
 const [file,type]=files[pathname]||['index.html','text/html'];
 if(pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(fs.readFileSync(path.join(root,file)));
}).listen(4310,'127.0.0.1',()=>console.log('MediaHub visual review on http://127.0.0.1:4310'));

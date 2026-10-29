const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const req = createRequire(path.resolve('next-app/package.json'));
const esbuild = req('esbuild');
const root = path.resolve('next-app');
const mock = {
  'next/link': `import React from 'react'; export default React.forwardRef(function Link({href,children,...props},ref){return <a ref={ref} href={href} {...props}>{children}</a>})`,
  'next/image': `import React from 'react'; export default function Image({fill,priority,...props}){return <img {...props}/>}`,
  'next/navigation': `export const usePathname=()=>window.location.pathname; export const useRouter=()=>({push:(url)=>location.href=url}); export const useSearchParams=()=>new URLSearchParams(location.search);`,
  'next-auth/react': `export const useSession=()=>({data:{user:{id:'preview',name:'Camille',email:'Compte de démonstration',role:'admin'}}}); export const signOut=()=>{};`,
  './NotificationBell': `import React from 'react'; import {Bell} from 'lucide-react'; export const NotificationBell=()=> <button aria-label="Notifications" className="p-2 text-gray-400"><Bell size={20}/></button>;`,
  './ImpersonationBannerClient': `export const ImpersonationBannerClient=()=>null;`,
  '@/components/global/MediaManagerModal': `import React from 'react'; export const MediaManagerModal=({onClose})=><div role="dialog" className="fixed inset-10 z-50 bg-gray-900 p-8 border border-gray-700"><h2>Stockage — aperçu</h2><button onClick={onClose}>Fermer</button></div>;`,
  './recent-requests/useRecentRequests': `import {useState} from 'react'; export function useRecentRequests(initial){const [showMineOnly,setShowMineOnly]=useState(false);return {requests:showMineOnly?initial.slice(0,2):initial,showMineOnly,setShowMineOnly}}`,
  './media-card/useMediaCardActions': `import {useState} from 'react'; export function useMediaCardActions(){const [isFavorite,F]=useState(false),[isWatchLater,W]=useState(false);return {isFavorite,isWatchLater,isTogglingFavorite:false,isTogglingWatchLater:false,handleToggleFavorite:()=>F(!isFavorite),handleToggleWatchLater:()=>W(!isWatchLater)}}`,
};
(async()=>{
 await esbuild.build({entryPoints:['.ui-review/preview.tsx'],bundle:true,outfile:'.ui-review/app.js',jsx:'automatic',tsconfig:'next-app/tsconfig.json',nodePaths:[path.join(root,'node_modules')],plugins:[{name:'preview-only',setup(build){
 build.onResolve({filter:/.*/},args=>{if(/^react($|\/)|^react-dom($|\/)/.test(args.path))return {path:req.resolve(args.path)}; if(mock[args.path])return {path:args.path,namespace:'mock'};});
 build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mock[args.path],loader:'jsx',resolveDir:root}));
 }}]});
 const postcss=req('postcss'); const tw=req('@tailwindcss/postcss');
 const css=await postcss([tw({base:root})]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')});
 fs.writeFileSync('.ui-review/style.css',css.css);
 fs.copyFileSync(path.join(root,'public/logo.png'),'.ui-review/logo.png');
 console.log('Preview built with application components.');
})();

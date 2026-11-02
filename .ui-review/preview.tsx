import {DashboardLayout} from '@/app/dashboard/_components/DashboardLayout'
import {Recommendations} from '@/app/dashboard/media/Recommendations'
import {RecentlyWatched} from '@/app/dashboard/media/RecentlyWatched'
import {ReviewPages,MediaDetailReview} from './pages'
import {PageHeader} from '@/components/ui/layout/PageHeader'
import React, {useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {createMongoAbility} from '@casl/ability'
import {addDays,startOfMonth,startOfWeek,endOfMonth,endOfWeek,eachDayOfInterval,isSameDay} from 'date-fns'
import {AbilityContext} from '@/components/providers/AbilityContext'
import {ThemeProvider} from '@/components/providers/ThemeProvider'
import {Navbar} from '@/components/global/Navbar'
import {DashboardSearchBar} from '@/app/dashboard/_components/dashboard/DashboardSearchBar'
import {ServerStatusCard} from '@/app/dashboard/_components/dashboard/ServerStatusCard'
import {LibraryStatsCard} from '@/app/dashboard/_components/dashboard/LibraryStatsCard'
import {TransfersCard} from '@/app/dashboard/_components/dashboard/TransfersCard'
import {QuickNavCards} from '@/app/dashboard/_components/dashboard/QuickNavCards'
import {CalendarHeader} from '@/components/global/release-calendar/_components/CalendarHeader'
import {CalendarGrid} from '@/components/global/release-calendar/_components/CalendarGrid'
import {RecentRequests} from '@/app/dashboard/_components/RecentRequests'
import {MediaCard} from '@/components/global/MediaCard'
import {MediaTypeTabs} from '@/app/dashboard/media/_components/MediaTypeTabs'
import {MediaFilterPills} from '@/app/dashboard/media/_components/MediaFilterPills'
import {DownloadsHeader} from '@/app/dashboard/downloads/_components/downloads-client/DownloadsHeader'
const ability=createMongoAbility([{action:'manage',subject:'all'}]);
const names=["Avatar : La Voie de l'eau",'Silo','Arcane','2 Fast 2 Furious','Dune','Le Voyage de Chihiro'];
const posters=['/7TOaaKbSYfilIpZsRCS1AyFCxaJ.jpg','/dxktdopZCOlff10ocoEdn2TXBzl.jpg','/ypS7R36Vjcn51zZsXsta5onnaCo.jpg','/riIa9UIxyhhOBIXI8vhpWmcesGB.jpg'];
const stats={library:{movies:166,series:52,episodes:1436},disk:{used:'4,52 To',total:'5,87 To',percent:77,free:'1,35 To'}};
const requests=names.map((title,i)=>({id:i+1,type:i%2?'tv':'movie',status:i%3?5:2,media:{title,tmdbId:i+1,posterPath:posters[i%4]},requestedBy:{displayName:'Camille'}}));
function App(){
 const [query,Q]=useState(''),ref=useRef(null),[date,D]=useState(new Date(2026,8,15)),[movies,M]=useState(true),[series,S]=useState(true),[tab,T]=useState('qbit'),[selected,E]=useState('');
 const days=eachDayOfInterval({start:startOfWeek(startOfMonth(date),{weekStartsOn:1}),end:endOfWeek(endOfMonth(date),{weekStartsOn:1})});
 const media=location.pathname.includes('/media'); const downloads=location.pathname.includes('/downloads');
 return <AbilityContext.Provider value={ability}><ThemeProvider><div className="app-shell min-h-screen text-gray-100">
 <a href="#main-content" className="skip-link">Aller au contenu</a><Navbar configStatus={{hasDownloads:true,hasDocker:true}}/>
 <main id="main-content" tabIndex={-1} className="app-main">
 <p className="text-xs text-gray-400 mb-4">Aperçu local · Données de démonstration</p>
 {!media&&!downloads&&location.pathname!=='/dashboard'?<ReviewPages path={location.pathname}/>:downloads?<><DownloadsHeader activeTab={tab} hasQbit hasSmb hasProwlarr permissions={{canReadTorrents:true,canReadExplorer:true,canInteractiveSearch:true}} onTabChange={T}/><p className="p-8 text-gray-400">{tab==='qbit'?'Aucun transfert de démonstration':tab==='smb'?'Explorateur de fichiers':'Recherche interactive'}</p></>:media&&/^\/dashboard\/media\/[^/]+$/.test(location.pathname)?<MediaDetailReview/>:media?<div className="space-y-6"><PageHeader title="Ma médiathèque" description="Retrouvez vos films, vos séries et vos listes personnelles."/><MediaFilterPills currentType="all" isFavoritesOnly={false} isWatchLaterOnly={false}/><MediaTypeTabs currentType="all" isFavoritesOnly={false} isWatchLaterOnly={false}/><Cards/></div>:<DashboardLayout overview={<div className="space-y-6">
 <DashboardSearchBar userName="Camille" searchQuery={query} onSearchQueryChange={Q} searchResults={query.length>1?[{id:1,title:'Dune : Deuxième partie',type:'movie',year:'2024',poster:null}]:[]} isSearching={false} showResults={query.length>1} onFocusOpenResults={()=>{}} containerRef={ref}/>
 <div className="mh-home-media"><Recommendations items={names.map((title,i)=>({id:i+1,title,poster_path:posters[i%4],media_type:i%2?'tv':'movie',vote_average:8}))}/><RecentlyWatched items={names.slice(0,3).map((title,i)=>({id:String(i+1),title,name:title,poster_path:posters[i],media_type:'movie',type:'Movie',overview:'',lastPlayedDate:'Hier'}))}/></div>
 <div className="mh-service-strip"><ServerStatusCard servicesStatus={{emby:'online',serverType:'emby'}} stats={stats}/><LibraryStatsCard stats={stats}/><TransfersCard activeTorrents={[]} totalDlSpeed={0} totalUlSpeed={1400000}/><QuickNavCards/></div>
 </div>} calendar={<section>
 <CalendarHeader date={date} isLoading={false} showMovies={movies} showSeries={series} onToggleMovies={()=>M(!movies)} onToggleSeries={()=>S(!series)} onNavigate={a=>D(a==='TODAY'?new Date(2026,8,15):new Date(date.getFullYear(),date.getMonth()+(a==='NEXT'?1:-1),15))}/>
 <CalendarGrid date={date} calendarDays={days} getDayEvents={day=>day.getDate()%8===2&&series?[{id:day.getDate(),title:'Silo · S3 E10',mediaType:'tv',status:'monitored'}]:day.getDate()===20&&movies?[{id:20,title:'Dune',mediaType:'movie',status:'monitored'}]:[]} onSelectEvent={e=>E(e.title)} onEventMouseEnter={()=>{}} onEventMouseMove={()=>{}} onEventMouseLeave={()=>{}}/>
 {selected&&<p role="status">{selected}</p>}</section>} requests={<RecentRequests requests={requests}/>}/>}
 </main></div></ThemeProvider></AbilityContext.Provider>
}
function Cards(){return <div className="mh-media-grid">{names.slice(0,4).map((title,i)=><MediaCard key={title} item={{id:String(i+1),title,media_type:i===1||i===2?'tv':'movie',poster_path:posters[i]}} showFavoriteButton/>)}</div>}
createRoot(document.getElementById('root')!).render(<App/>);

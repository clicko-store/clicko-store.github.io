/* Progressive catalog image enhancements; leave hero/logo images eager. */
(function(){
 const apply=(root)=>{
  if(!root)return;
  const imgs=root.querySelectorAll('img');
  for(const img of imgs){
   if(img.dataset.clickoImageOptimized)return;
   img.dataset.clickoImageOptimized='1';
   img.decoding='async';
   if(!img.hasAttribute('loading'))img.loading='lazy';
  }
 };
 const start=()=>{
  const grid=document.getElementById('grid');
  if(!grid)return;
  apply(grid);
  const observer=new MutationObserver(()=>apply(grid));
  observer.observe(grid,{childList:true,subtree:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

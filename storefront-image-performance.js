/* Progressive image enhancements; never alter source URLs or product data. */
(function(){
 const apply=(root)=>{
  const imgs=root.querySelectorAll?root.querySelectorAll('img'):[];
  for(const img of imgs){
   if(img.dataset.clickoImageOptimized)return;
   img.dataset.clickoImageOptimized='1';
   img.decoding='async';
   if(!img.hasAttribute('loading'))img.loading='lazy';
  }
 };
 const start=()=>{
  apply(document);
  const grid=document.getElementById('grid');
  if(grid){
   const observer=new MutationObserver(()=>apply(grid));
   observer.observe(grid,{childList:true,subtree:true});
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

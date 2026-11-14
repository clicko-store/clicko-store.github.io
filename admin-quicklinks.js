/* Navigation only: existing Supabase authentication and order permissions remain authoritative. */
(function(){
 function init(){
  const main=document.querySelector('main');if(!main)return;
  const nav=document.createElement('nav');nav.className='clicko-admin-quicklinks';nav.setAttribute('aria-label','ทางลัดหลังบ้าน');
  [['จัดการสินค้า','#product-form'],['ค้นหาสต๊อก','#search'],['สต๊อกเข้า–ออก','./inventory.html'],['ยอดขายและกำไร','./orders.html'],['หน้าร้าน','./index.html']].forEach(([label,href])=>{
   const a=document.createElement('a');a.href=href;a.textContent=label;nav.append(a);
  });
  main.prepend(nav);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
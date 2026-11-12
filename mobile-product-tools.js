/* CLICKO progressive product detail tools. No writes to inventory or orders. */
(function(){
'use strict';
const fb='https://www.facebook.com/sippavit.gomarn/';
const style=document.createElement('style');
style.textContent=`
.clicko-detail-tools{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.clicko-detail-tools button,.clicko-detail-tools a{flex:1;min-width:135px;text-align:center;display:grid;place-items:center;padding:12px;border-radius:11px;border:1px solid #b7d4f5;background:#f3f8ff;color:#123d70;font:700 13px system-ui;text-decoration:none;cursor:pointer}
.clicko-detail-tools .primary{background:#087af1;color:white;border-color:#087af1}
.clicko-detail-tools .tool-feedback{flex-basis:100%;font-size:12px;color:#315c80}
.clicko-zoom-dialog{border:0;padding:0;max-width:96vw;max-height:94vh;background:#101820;border-radius:14px}
.clicko-zoom-dialog::backdrop{background:#000c}
.clicko-zoom-dialog img{display:block;max-width:94vw;max-height:85vh;object-fit:contain}
.clicko-zoom-dialog button{position:absolute;right:8px;top:8px;background:#fff;color:#111;border:0;border-radius:50%;height:40px;width:40px;font-size:22px;cursor:pointer}
#grid .clicko-new-tag{position:absolute;top:7px;right:7px;background:#087af1;color:white;font-size:10px;font-weight:800;border-radius:6px;padding:4px 7px;z-index:2}
#grid .pic{position:relative}
`;
document.head.append(style);
const zoom=document.createElement('dialog');zoom.className='clicko-zoom-dialog';zoom.setAttribute('aria-label','ขยายรูปสินค้า');
const zoomImg=document.createElement('img');zoomImg.alt='ภาพสินค้าขยาย';
const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','ปิดรูปภาพ');close.onclick=()=>zoom.close();
zoom.append(zoomImg,close);document.body.append(zoom);
zoom.addEventListener('click',e=>{if(e.target===zoom)zoom.close()});
function productForDialog(){
 const node=document.querySelector('#product-detail .clicko-detail-id');if(!node||typeof products==='undefined')return null;
 const sku=(node.textContent||'').match(/CLK-[A-Za-z0-9_-]+/);
 return sku?products.find(p=>String(p.id)===sku[0]):null;
}
function tools(){
 const dialog=document.getElementById('product-detail');
 if(!dialog||!dialog.open)return;
 const content=document.getElementById('detail-content'),visual=document.getElementById('detail-visual');
 const p=productForDialog();if(!p||!content||content.querySelector('.clicko-detail-tools'))return;
 const group=document.createElement('div');group.className='clicko-detail-tools';
 const copy=document.createElement('button');copy.type='button';copy.textContent='คัดลอกข้อความสอบถาม';
 const chat=document.createElement('a');chat.href=fb;chat.target='_blank';chat.rel='noopener noreferrer';chat.className='primary';chat.textContent='เปิด Facebook เพื่อสอบถาม';
 const feedback=document.createElement('span');feedback.className='tool-feedback';feedback.setAttribute('role','status');
 const price=Number.isFinite(p.price)?p.price.toLocaleString('th-TH')+' บาท':'สอบถามราคา';
 const msg='สวัสดีครับ สนใจสินค้า '+p.name+' (รหัส '+p.id+') ราคา '+price+' สถานะ '+(p.stock_status||'สอบถามร้าน')+' รบกวนเช็กสต๊อกและรายละเอียดให้หน่อยครับ';
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(msg);feedback.textContent='คัดลอกแล้ว นำไปวางในแชทได้เลย';}catch(e){feedback.textContent='คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความด้วยตนเอง';const area=document.createElement('textarea');area.value=msg;area.readOnly=true;group.append(area);area.focus();area.select();}};
 group.append(copy,chat,feedback);content.append(group);
 if(visual&&!visual.dataset.clickoZoomBound){
  visual.dataset.clickoZoomBound='1';
  visual.addEventListener('click',e=>{const img=e.target.closest('img.clicko-main-photo');if(!img)return;zoomImg.src=img.currentSrc||img.src;zoomImg.alt=img.alt;zoom.showModal()});
  visual.style.cursor='zoom-in';
 }
}
function badges(){
 if(typeof products==='undefined')return;
 const now=Date.now();
 document.querySelectorAll('#grid .pic[data-pid]').forEach(pic=>{
  if(pic.querySelector('.clicko-new-tag'))return;
  const p=products.find(x=>String(x.id)===pic.dataset.pid);
  if(!p||!p.created_at)return;
  const created=Date.parse(p.created_at);
  if(!Number.isFinite(created)||created>now||now-created>3*86400000)return;
  const badge=document.createElement('span');badge.className='clicko-new-tag';badge.textContent='NEW';pic.append(badge);
 });
}
let scheduled=false;
function update(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;tools();badges()})}
const begin=()=>{
 const dialog=document.getElementById('product-detail'),grid=document.getElementById('grid');
 if(dialog)new MutationObserver(update).observe(dialog,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 if(grid)new MutationObserver(update).observe(grid,{childList:true});
 update();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',begin,{once:true});else begin();
})();

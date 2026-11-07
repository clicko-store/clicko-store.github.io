import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const pages=['index.html','admin.html','orders.html','backup.html'];
let assertions=0;
const ok=(condition,message)=>{assert.ok(condition,message);assertions++};
const html={};
for(const file of pages){
  const content=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  html[file]=content;
  const scripts=[...content.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean);
  ok(scripts.length>=1,file+' must contain local JS');
  for(const [i,source] of scripts.entries()){
    new vm.Script(source,{filename:file+'-inline-'+(i+1)});
    assertions++;
  }
}
ok(html['admin.html'].includes('clicko_product_photos'),'Admin must use gallery table');
ok(html['index.html'].includes('clickoGalleryPhotos'),'Storefront must render uploaded gallery');
ok(html['orders.html'].includes('pendingAgeHours'),'Orders must show aging of reservations');
ok(html['backup.html'].includes('clicko_orders'),'Backup must include order archive');
ok(html['backup.html'].includes('clicko_product_costs'),'Backup must include private costs');
ok(html['backup.html'].includes("if(prompt('กู้คืนเฉพาะรายการที่ขาด"),'Restore must require explicit confirmation');
ok(!html['backup.html'].includes('service_role'),'Never expose service-role credentials in backup client');
ok(!html['admin.html'].includes(".auth.signUp("),'Admin login must not offer self-registration');
ok(html['admin.html'].includes('manufacturer_image_verified'),'Admin must verify manufacturer image source');
ok(html['admin.html'].includes('manufacturer_source_url'),'Admin must record manufacturer source URL');
ok(html['index.html'].includes('ภาพจากผู้ผลิต · ภาพประกอบ'),'Product cards must label manufacturer illustrations');
ok(html['index.html'].includes('manufacturer_image_verified?p.manufacturer_image_url'),'Only verified manufacturer photos may be used as fallback');
ok(html['backup.html'].includes("'manufacturer_image_verified'"),'Backups must include manufacturer image verification state');
const photoGuard=html['index.html'].match(/function clickoIsManufacturerPhoto\(p\)\{[^}]*\}/)?.[0];
ok(Boolean(photoGuard),'Find manufacturer photo provenance guard');
const manufacturerPhoto=vm.runInNewContext(photoGuard+';clickoIsManufacturerPhoto');
ok(manufacturerPhoto({image:'https://factory.example/a.png',manufacturer_image_url:'https://factory.example/a.png',manufacturer_image_verified:true})===true,'Verified manufacturer photo is labeled');
ok(manufacturerPhoto({image:'https://factory.example/a.png',manufacturer_image_url:'https://factory.example/a.png',manufacturer_image_verified:false})===false,'Unverified manufacturer photo is not labeled');
ok(manufacturerPhoto({image:'https://shop.example/actual.jpg',manufacturer_image_url:'https://factory.example/a.png',manufacturer_image_verified:true})===false,'Actual shop photo is not mislabeled as manufacturer illustration');

const storefront=html['index.html'];
const statusCode=storefront.match(/function clickoCanOrder\(p\)\{[^}]*\}/)?.[0];
const stockCode=storefront.match(/function clickoStockStatus\(p\)\{[^}]*\}/)?.[0];
ok(Boolean(statusCode&&stockCode),'Find inventory orderability functions');
const inventory=vm.runInNewContext(
  "let clickoInventoryVerified=true;let clickoVerifiedSkus=new Set(['QA-1']);"+stockCode+statusCode+';({clickoCanOrder,clickoStockStatus})'
);
ok(inventory.clickoCanOrder({id:'QA-1',stock_status:'available',sold:false,price:10})===true,'Verified available stock can be ordered');
ok(inventory.clickoCanOrder({id:'QA-1',stock_status:'reserved',sold:false,price:10})===false,'Reserved stock cannot be ordered');
ok(inventory.clickoCanOrder({id:'QA-1',stock_status:'sold',sold:true,price:null})===false,'Sold stock cannot be ordered');
ok(inventory.clickoCanOrder({id:'QA-UNSEEN',stock_status:'available',sold:false,price:10})===false,'Unverified SKU cannot be ordered');
ok(inventory.clickoCanOrder({id:'QA-1',stock_status:'available',sold:false,is_hidden:true,price:10})===false,'Archived SKU cannot be ordered');
ok(html['index.html'].includes('merged.filter(p=>!p.is_hidden)'),'Hidden products must be excluded from merged storefront');
ok(html['index.html'].includes('products.filter(p=>verified.has(String(p.id)))'),'Only database-verified products remain after Supabase sync');
ok(html['admin.html'].includes('toggleProductHidden'),'Admin must hide products without deleting them');
ok(html['orders.html'].includes("p.stock_status==='available'&&!p.is_hidden"),'Order form must exclude archived products');
ok(html['backup.html'].includes("'stock_status','is_hidden'"),'Backup recovery must preserve archived status');

const orders=html['orders.html'];
const transitions=orders.match(/const statusTransitions=(\{[^;]+\});/)?.[1];
ok(Boolean(transitions),'Find order transitions');
const rules=vm.runInNewContext('('+transitions+')');
ok(rules.pending.includes('paid')&&rules.pending.includes('cancelled'),'Pending order can be paid or cancelled');
ok(!rules.pending.includes('shipped'),'Cannot ship without payment confirmation');
ok(rules.shipped.length===1&&rules.shipped[0]==='shipped','Shipped orders cannot be cancelled');
ok(rules.cancelled.length===1&&rules.cancelled[0]==='cancelled','Cancelled orders remain final');
const moneySource=orders.match(/function validMoney\(raw,optional=false\)\{[^}]+\}/)?.[0];
ok(Boolean(moneySource),'Find payment input validation');
const money=vm.runInNewContext(moneySource+';validMoney');
ok(money('0.29')===.29,'Valid 2-place decimals accepted');
ok(money('')===undefined,'Blank required amount rejected');
ok(money('-1')===undefined,'Negative amount rejected');
ok(money('1.234')===undefined,'More than 2 decimals rejected');


// Search, filter and sort regression tests from actual embedded product data.
const dataStart=storefront.indexOf('const products=');
const dataEnd=storefront.indexOf(';let category=',dataStart);
ok(dataStart>=0&&dataEnd>dataStart,'Product catalog fixture available');
const fixture=vm.runInNewContext(storefront.slice(dataStart,dataEnd)+';products');
const filterStart=storefront.indexOf('function clickoFilterCatalogItems(');
const filterEnd=storefront.indexOf('\nfunction draw()',filterStart);
ok(filterStart>=0&&filterEnd>filterStart,'Unified catalog filter function exists');
const catalogFilter=vm.runInNewContext(stockCode+storefront.slice(filterStart,filterEnd)+';clickoFilterCatalogItems');
const baseFilter={category:'ทั้งหมด',condition:'',availability:'all',sort:'default'};
const gpro=catalogFilter(fixture,{...baseFilter,query:'G PRO'});
ok(gpro.length>0&&gpro.every(p=>p.name.toLowerCase().includes('g pro')),'G PRO search finds matching products');
ok(catalogFilter(fixture,{...baseFilter,query:'G   PRO'}).length===gpro.length,'Extra search whitespace gives same results');
const mouse=catalogFilter(fixture,{...baseFilter,category:'GAMING MOUSE'});
ok(mouse.length>0&&mouse.every(p=>p.category==='GAMING MOUSE'),'Category chips filter by category');
const used=catalogFilter(fixture,{...baseFilter,condition:'มือ2'});
ok(used.length>0&&used.every(p=>p.condition==='มือ2'),'Used condition filter works');
const newItems=catalogFilter(fixture,{...baseFilter,condition:'มือ1'});
ok(newItems.length>0&&newItems.every(p=>p.condition==='มือ1'),'New condition filter works');
const ready=catalogFilter(fixture,{...baseFilter,availability:'available'});
ok(ready.every(p=>!p.sold),'Available condition filter excludes sold products');
const low=catalogFilter(fixture,{...baseFilter,sort:'low'});
const high=catalogFilter(fixture,{...baseFilter,sort:'high'});
ok(low[0].price<=low[1].price&&high[0].price>=high[1].price,'Price sort works in both directions');
ok(catalogFilter(fixture,{...baseFilter,query:'no-product-exists-123'}).length===0,'No-results query returns empty list');
ok(catalogFilter(fixture,{...baseFilter,query:''}).length===fixture.length,'Clearing search restores full list');
ok(storefront.includes('id="clicko-catalog-controls-fix"'),'Final catalog filter event handlers installed');
ok(storefront.includes("search.addEventListener('input'")&&storefront.includes("chipList.addEventListener('click'"),'Search and category chip event listeners installed');
ok(storefront.includes("controls.forEach(select=>select.addEventListener('change',refresh))"),'Dropdown filter and sort events installed');


// Execute the actual final-page event controller against mock controls to verify interactions.
const controller=storefront.match(/<script id="clicko-catalog-controls-fix">([\s\S]*?)<\/script>/)?.[1];
ok(Boolean(controller),'Active catalog control script exists');
const eventFns={};
const nodes={};
for(const id of ['q','condition','availability','sort','chips','count']){
 nodes[id]={
  value:'',textContent:id==='count'?'12 รายการ':'',
  addEventListener:(kind,callback)=>{eventFns[id+':'+kind]=callback},
  contains:()=>true
 };
}
const appended=[];
const fakeDocument={
 getElementById:id=>nodes[id]||null,
 createElement:tag=>({tagName:tag,textContent:'',setAttribute(){}}),
 querySelector:()=>({append:node=>appended.push(node)})
};
let rendered=0;
const state={document:fakeDocument,category:'GAMING MOUSE',categories:['ทั้งหมด','GAMING MOUSE'],draw:()=>{rendered++}};
vm.runInNewContext(controller,state);
ok(rendered===1,'Filter controller renders initial state');
nodes.q.value='G PRO';
eventFns['q:input']();
ok(rendered===2&&state.category==='ทั้งหมด','Search immediately draws and clears a previous category filter');
eventFns['condition:change']();
eventFns['availability:change']();
eventFns['sort:change']();
ok(rendered===5,'All three dropdowns redraw products on selection');
eventFns['chips:click']({target:{closest:()=>({dataset:{cat:'GAMING MOUSE'}})}});
ok(rendered===6&&state.category==='GAMING MOUSE','Clicking category chip updates category and renders');
ok(appended.length===1&&appended[0].textContent.includes('G PRO'),'Screen-reader filter status reflects current search');

console.log('Clicko QA passed: '+assertions+' checks across '+pages.join(', '));

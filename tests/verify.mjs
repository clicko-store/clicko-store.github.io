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

console.log('Clicko QA passed: '+assertions+' checks across '+pages.join(', '));

/* Precios con fecha de vigencia; los importes reales y las equivalencias no se mezclan. */
(() => {
  'use strict';
  const EFFECTIVE='2026-11-02', VERSION=30;
  const standard=['Clásicos','Red velvet','Oreo',"M&M's",'Intenso'];
  const minis=['Mini clásico','Mini red velvet','Mini Oreo',"Mini M&M's",'Mini intenso'];
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
  const cents=value=>Math.round(Number(value)*100);
  const round=value=>cents(value)/100;
  function dateMX(raw=Date.now()) {
    if(typeof raw==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const dt=new Date(raw+'T12:00:00Z');return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===raw?raw:'';
    }
    const dt=new Date(raw);if(!Number.isFinite(dt.getTime()))return '';
    const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(dt),v=k=>p.find(x=>x.type===k)?.value;
    return `${v('year')}-${v('month')}-${v('day')}`;
  }
  function isFT(client){const text=norm(typeof client==='string'?client:client?.name||client?.customerName||client?.route||'');return /^ft(?:\s|[.\-:]|$)/.test(text)||/\bfarmacias? tepa\b/.test(text)}
  const isMini=product=>/^mini(?:\s|$)/.test(norm(typeof product==='object'?product?.name||product?.product:product));
  const isCookie=product=>/\bgalletas?\b/.test(norm(typeof product==='object'?product?.name||product?.product:product));
  function isBrownie(product){const name=norm(typeof product==='object'?product?.name||product?.product:product);return !isMini(name)&&!isCookie(name)&&!/proteina|brownieve|cheese|corazon|cajita/.test(name)&&(/\bbrownies?\b/.test(name)||['clasico','clasicos','red velvet','oreo','m&ms','m&m','intenso','chocolate intenso'].includes(name))}
  const equivalent=(product,qty=1)=>Number(qty||0)*(isMini(product)?.5:isBrownie(product)?1:0);
  const validPrice=value=>Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=10000;
  function entryFor(client,day){return [...(Array.isArray(client?.priceHistory)?client.priceHistory:[])].filter(h=>dateMX(h.effectiveFrom)&&h.effectiveFrom<=day).sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)||String(a.updatedAt||'').localeCompare(String(b.updatedAt||''))).at(-1)}
  function priceFor(client,product='Clásicos',raw=Date.now(),fallback=23){
    const day=dateMX(raw)||dateMX(),h=entryFor(client,day),mini=isMini(product),cookie=isCookie(product);
    const override=mini?h?.miniPrice:cookie?h?.cookiePrice:h?.classicPrice;
    if(validPrice(override))return round(override);
    if(mini)return 15;
    if(cookie)return round(validPrice(client?.cookiePrice)?client.cookiePrice:validPrice(fallback)?fallback:23);
    const ftSale=isFT(client)?[...(client?.sales||[])].filter(s=>Number(s.paid)>0&&!s.items?.some(i=>isMini(i.product)||isCookie(i.product))).sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||''))).find(s=>validPrice(s.unitPrice??Number(s.total)/Number(s.paid))):null;
    const legacy=[client?.browniePrice,client?.unitPrice,client?.price,ftSale?.unitPrice,ftSale?Number(ftSale.total)/Number(ftSale.paid):null,fallback].find(validPrice);
    if(isFT(client)||day<EFFECTIVE)return round(legacy??23);
    return isBrownie(product)?25:round(validPrice(fallback)?fallback:23);
  }
  function setClientPrice(client,input){
    const effectiveFrom=dateMX(input?.effectiveFrom);if(!effectiveFrom)throw Error('Selecciona una fecha de vigencia válida.');
    const parse=value=>value==null||value===''?null:validPrice(value)?round(value):(()=>{throw Error('Captura un precio mayor a cero y hasta $10,000.');})();
    const previous=entryFor(client,effectiveFrom),classicDarkisPrice=input.classicDarkisPrice===undefined?previous?.classicDarkisPrice??null:parse(input.classicDarkisPrice),miniDarkisPrice=input.miniDarkisPrice===undefined?previous?.miniDarkisPrice??null:parse(input.miniDarkisPrice);
    const classicPrice=parse(input.classicPrice),miniPrice=parse(input.miniPrice),reason=String(input.reason||'Precio por cliente').trim().slice(0,240);
    const updatedAt=new Date().toISOString(),entry={effectiveFrom,classicPrice,miniPrice,classicDarkisPrice,miniDarkisPrice,reason,updatedAt};
    const history=[...(client.priceHistory||[])];
    return {...client,priceHistory:[...history,entry].sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom)),pricingUpdatedAt:updatedAt,updatedAt};
  }
  function darkisPriceFor(client,product,date,fallback){
    const day=dateMX(date)||dateMX(),h=entryFor(client,day);
    const override=isMini(product)?h?.miniDarkisPrice:h?.classicDarkisPrice;
    if(validPrice(override))return round(override);
    if(isMini(product))return 12;
    if(day>=EFFECTIVE&&isBrownie(product)&&!isFT(client))return 21;
    return round(validPrice(fallback)?fallback:priceFor(client,product,date));
  }
  function withdrawalPrices(date=Date.now()){const day=dateMX(date)||dateMX();return [...standard.map(()=>day>=EFFECTIVE?2100:1900),1900,1900,...minis.map(()=>1200)];}
  function quote(client,items,date){
    const lines=(items||[]).map(item=>{
      const qty=Number(item.qty),product=String(item.product||'');
      if(!product||!Number.isInteger(qty)||qty<0||qty>100000)throw Error('Revisa los productos y cantidades.');
      let unitPrice=priceFor(client,product,date,item.unitPrice??23);
      if(item.priceOverride===true){if(!Number.isFinite(Number(item.unitPrice))||Number(item.unitPrice)<0||Number(item.unitPrice)>10000)throw Error('Precio manual inválido.');unitPrice=round(item.unitPrice)}
      const darkisUnitPrice=item.darkisPriceOverride===true&&validPrice(item.darkisUnitPrice)?round(item.darkisUnitPrice):darkisPriceFor(client,product,date,item.darkisUnitPrice??(isFT(client)&&isBrownie(product)?client?.settlementPrice??19:unitPrice));
      return {...item,product,qty,unitPrice,total:Math.round(qty*cents(unitPrice))/100,darkisUnitPrice,darkisTotal:Math.round(qty*cents(darkisUnitPrice))/100,materialFactor:isMini(product)?.5:1,packingFactor:isMini(product)?2:1};
    });
    const total=lines.reduce((n,x)=>n+cents(x.total),0)/100,darkisIncome=lines.reduce((n,x)=>n+cents(x.darkisTotal),0)/100;
    return {items:lines,total,publicTotal:total,darkisIncome,margin:round(total-darkisIncome),paid:lines.reduce((n,x)=>n+x.qty,0),brownieEquivalents:lines.reduce((n,x)=>n+equivalent(x.product,x.qty),0)};
  }
  function repriceContribution(sale,client={}){
    const day=dateMX(sale.date||sale.createdAt);if(!day||day<EFFECTIVE||sale.saleClass==='Cortesía'||sale.pendingDuplicate||sale.unconfirmed||sale.pendingConsignment)return sale;
    const person={...client,name:client.name||sale.customerName||sale.route};
    const paid=Number(sale.paid)||0;if(!(paid>0))return sale;
    const explicit=Array.isArray(sale.items)&&sale.items.length&&sale.items.every(x=>Number.isInteger(Number(x.qty))&&Number(x.qty)>=0)&&sale.items.reduce((n,x)=>n+Number(x.qty),0)===paid;
    const items=explicit?sale.items:[{product:'Brownie sin especificar',qty:paid}];
    if(isFT(person)&&!entryFor(person,day)&&!items.some(x=>isMini(x.product)))return sale;
    let quoted=quote(person,items.map(x=>sale.priceOverride?{...x,priceOverride:true,unitPrice:x.unitPrice??sale.unitPrice??Number(sale.total)/paid}:x),day);if(sale.priceOverride)quoted={...quoted,total:Number(sale.total),publicTotal:Number(sale.total),margin:round(Number(sale.total)-quoted.darkisIncome)};
    const meaningful=quoted.darkisIncome!==Number(sale.darkisIncome)||quoted.total!==Number(sale.total)||(explicit&&quoted.items.some((item,i)=>item.unitPrice!==sale.items[i].unitPrice||item.total!==sale.items[i].total||item.darkisTotal!==sale.items[i].darkisTotal));
    if(!meaningful&&sale.pricingVersion===VERSION&&sale.brownieEquivalents===quoted.brownieEquivalents)return sale;
    const original=sale.pricingMigration||{version:VERSION,effectiveFrom:EFFECTIVE,originalTotal:Number(sale.total)||0,originalUnitPrice:sale.unitPrice??null,at:new Date().toISOString()};
    const prices=new Set(quoted.items.map(x=>x.unitPrice));
    return {...sale,items:explicit?quoted.items:sale.items,total:quoted.total,publicTotal:quoted.publicTotal,darkisIncome:quoted.darkisIncome,margin:quoted.margin,unitPrice:prices.size===1?quoted.items[0].unitPrice:Number(sale.unitPrice)||25,brownieEquivalents:quoted.brownieEquivalents,pricingVersion:VERSION,pricingMigration:original,updatedAt:new Date().toISOString()};
  }
  function repriceFinancialSale(sale,client={}){
    const day=dateMX(sale.date);if(!day||day<EFFECTIVE||sale.saleClass==='Cortesía'||!(Number(sale.qty)>0)||(!isBrownie(sale.product)&&!isMini(sale.product)))return sale;
    const person={...client,name:client.name||sale.route||sale.customerName};
    if(isFT(person)&&!entryFor(person,day)&&!isMini(sale.product))return sale;
    const publicUnitPrice=sale.priceOverride?Number(sale.publicUnitPrice??sale.unitPrice):priceFor(person,sale.product,day,sale.publicUnitPrice??sale.unitPrice),unitPrice=darkisPriceFor(person,sale.product,day,sale.darkisUnitPrice??sale.unitPrice),total=round(Number(sale.qty)*unitPrice),brownieEquivalents=equivalent(sale.product,sale.qty);
    if(unitPrice===sale.unitPrice&&total===sale.total&&sale.pricingVersion===VERSION&&sale.brownieEquivalents===brownieEquivalents)return sale;
    return {...sale,unitPrice,total,darkisUnitPrice:unitPrice,darkisIncome:total,publicUnitPrice,publicTotal:round(Number(sale.qty)*publicUnitPrice),expectedPrice:unitPrice,brownieEquivalents,priceStatus:'Vigencia por cliente',pricingVersion:VERSION,pricingMigration:sale.pricingMigration||{version:VERSION,effectiveFrom:EFFECTIVE,originalTotal:sale.total,originalUnitPrice:sale.unitPrice,at:new Date().toISOString()}};
  }
  window.DarkisPricing={EFFECTIVE,VERSION,standard,minis,norm,dateMX,isFT,isMini,isCookie,isBrownie,equivalent,priceFor,darkisPriceFor,withdrawalPrices,unitPrice:priceFor,setClientPrice,quote,repriceContribution,repriceFinancialSale};
})();

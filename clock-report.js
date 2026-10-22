/* Reporte PDF local: membrete Darkis, todas las filas y señal por movimiento. */
(() => {
  'use strict';
  const blue = '0.031 0.494 0.682', orange = '0.953 0.353 0.157', ink = '0.09 0.20 0.27';
  const bytes = text => Uint8Array.from(text, c => c.charCodeAt(0) & 255);
  const literal = value => '(' + Array.from(String(value)).map(c => {
    if ('\\()'.includes(c)) return '\\' + c;
    let n = c.charCodeAt(0);
    if (n === 0x2013 || n === 0x2014) n = 45;
    if (n === 0x202f || n === 0xa0) n = 32;
    return n > 255 ? '?' : n < 32 || n > 126 ? '\\' + n.toString(8).padStart(3,'0') : c;
  }).join('') + ')';
  function wrap(value, limit = 94) {
    const words = String(value || '').replace(/\s+/g,' ').trim().match(/\S{1,90}/g) || [];
    const lines = []; let line = '';
    for (const word of words) { if (line.length + word.length + 1 > limit) { lines.push(line); line = word; } else line += (line ? ' ' : '') + word; }
    if (line) lines.push(line); return lines;
  }
  async function logo() {
    const image = new Image(); image.src = new URL('./logo.png', document.baseURI).href; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = Math.round(720 * image.height / image.width);
    const ctx = canvas.getContext('2d'); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,rgb=[],alpha=[];for(let i=0;i<rgba.length;i+=4){rgb.push(String.fromCharCode(rgba[i],rgba[i+1],rgba[i+2]));alpha.push(String.fromCharCode(rgba[i+3]))}
    return {width:canvas.width,height:canvas.height,data:rgb.join(''),alpha:alpha.join('')};
  }
  async function build(report) {
    const image = await logo(), objects = [''];
    const add = value => (objects.push(value), objects.length - 1);
    const catalog = add(''), pages = add('');
    const embedFont = (font, name) => {
      const data = atob(font.data);
      const file = add(`<< /Length ${data.length} /Length1 ${data.length} >>\nstream\n${data}\nendstream`);
      const descriptor = add(`<< /Type /FontDescriptor /FontName /${name} /Flags 32 /FontBBox [${font.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${font.ascent} /Descent ${font.descent} /CapHeight 730 /StemV 80 /FontFile2 ${file} 0 R >>`);
      return add(`<< /Type /Font /Subtype /TrueType /BaseFont /${name} /FirstChar 32 /LastChar 255 /Widths [${font.widths.join(' ')}] /Encoding /WinAnsiEncoding /FontDescriptor ${descriptor} 0 R >>`);
    };
    const regular = embedFont(window.DarkisReportFonts.regular, 'DarkisSans');
    const bold = embedFont(window.DarkisReportFonts.bold, 'DarkisSansBold');
    const maskId=add(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${image.alpha.length} >>\nstream\n${image.alpha}\nendstream`);
    const imageId = add(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${maskId} 0 R /Length ${image.data.length} >>\nstream\n${image.data}\nendstream`);
    const chunks = []; let chunk = [], used = 0;
    for (const r of [...report.records,...(report.deletedRecords||[])].sort((a,b)=>a.timestamp-b.timestamp)) {
      const notes = r.manualEdited && r.editReason ? wrap('Nota: ' + r.editReason) : [];const long=(report.longShifts||[]).find(s=>s.entry.id===r.id||s.exit?.id===r.id);if(long)notes.push('Turno >8 h: '+(long.confirmed?'confirmado por la persona':'pendiente de revisar'));
      if(r.selectionNote)notes.push(...wrap(r.selectionNote));
      const height = (r.manualEdited ? 49 : 34) + notes.length * 11;
      if (used + height > 400 && chunk.length) { chunks.push(chunk); chunk = []; used = 0; }
      chunk.push({r,notes,height}); used += height;
    }
    if (chunk.length || !chunks.length) chunks.push(chunk);const deductionPages=[];for(let i=0;i<(report.deductions||[]).length;i+=8)deductionPages.push(report.deductions.slice(i,i+8));const pageCount=chunks.length+deductionPages.length;
    const pageIds = [], date = ms => new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ms));
    const time = ms => new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
    chunks.forEach((rows, pageIndex) => {
      const commands = [];
      const rect = (x,y,w,h,color) => commands.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
      const text = (value,x,y,size=10,color=ink,heavy=false) => commands.push(`BT /${heavy?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm ${literal(value)} Tj ET`);
      rect(0,691,612,101,blue);rect(0,684,612,7,orange);rect(570,691,42,101,'0.02 0.39 0.55');
      commands.push(`q 131 0 0 ${131*image.height/image.width} 43 717 cm /Logo Do Q`);
      text(report.title||'REPORTE DE HORARIO',207,746,18,'1 1 1',true);
      text('PERSONAL / LIQUIDACIÓN DE HORAS',208,725,9,'1 1 1');
      text('Empleado: ' + report.employee.slice(0,65),36,659,13,ink,true);
      text('Periodo: ' + report.period+(report.selectionId?' | Ref. '+report.selectionId.slice(-8):''),36,638,10);
      rect(36,576,540,47,'0.94 0.97 0.98');
      text('SUELDO BRUTO',48,607,8,blue,true);text(report.grossText||report.payText,48,587,16,ink,true);
      text('DESCUENTOS',231,607,8,blue,true);text(report.deductionText||'$0.00',231,587,13,ink,true);
      text('NETO A RECIBIR',407,607,8,blue,true);text(report.payText,407,587,16,ink,true);
      text(report.hours.toFixed(2)+' h seleccionadas  /  '+report.rateText+' por hora',36,567,9,blue,true);
      text(`${report.records.length} movimientos activos | ${report.records.filter(r=>r.manualEdited).length} manuales | ${(report.deletedRecords||[]).length} eliminados`,36,552,8);
      rect(36,525,540,23,blue); text('MOVIMIENTO',46,533,8,'1 1 1',true); text('FECHA',152,533,8,'1 1 1',true); text('HORA',255,533,8,'1 1 1',true); text('ORIGEN DEL REGISTRO',340,533,8,'1 1 1',true);
      let y = 525;
      if (!rows.length) text('Sin movimientos registrados en este periodo.',46,502,10);
      for (const {r,notes,height} of rows) {
        rect(36,y-height,540,height-1,r.deleted?'0.94 0.94 0.94':r.manualEdited?'1 0.96 0.90':'0.97 0.98 0.99');
        text(r.type==='entry'?'Entrada':'Salida',46,y-16,10,ink,true); text(date(r.timestamp),152,y-16,10); text(time(r.timestamp),255,y-16,10,ink,true);
        text(r.deleted?'ELIMINADA (NO SUMA HORAS)':r.manualEdited?(r.manualCreated?'AGREGADA MANUALMENTE':'MODIFICADA MANUALMENTE'):'Automático',340,y-16,r.manualEdited?8:9,r.manualEdited?'0.65 0.24 0.06':blue,Boolean(r.manualEdited));
        if (r.manualEdited) {
          text(r.deleted?'Anulada el '+date(r.deletedAt)+' '+time(r.deletedAt):Number.isFinite(r.originalTimestamp)?'Hora original: '+date(r.originalTimestamp)+' '+time(r.originalTimestamp):'Sin marcación automática original',46,y-32,8);

        }
        notes.forEach((line,i)=>text(line,46,y-(r.manualEdited?44:29)-i*11,8));
        y -= height;
      }
      rect(36,79,540,1,'0.84 0.89 0.91');
      text(report.sequenceWarnings?`${report.sequenceWarnings} movimiento(s) sin pareja: revisar. Las filas eliminadas no suman horas.`:'Las filas eliminadas no suman horas. Cada ajuste manual está identificado.',36,65,8,ink,true);
      text(report.selectionId?'Selección para revisión. Generar este PDF no confirma pago.':'Horario de Ciudad de México. Turnos abiertos calculados hasta la emisión.',36,51,8);
      text('Emitido: '+date(report.issuedAt)+' '+time(report.issuedAt),36,31,8);
      text(`Página ${pageIndex+1} de ${pageCount}`,485,31,8,blue);
      const stream = commands.join('\n');
      const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      pageIds.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> /XObject << /Logo ${imageId} 0 R >> >> /Contents ${contents} 0 R >>`));
    });
    deductionPages.forEach((items,idx)=>{const cmds=[],text=(v,x,y,size=10,color=ink,bold=false)=>cmds.push(`BT /${bold?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm ${literal(v)} Tj ET`),rect=(x,y,w,h,c)=>cmds.push(`${c} rg ${x} ${y} ${w} ${h} re f`);rect(0,691,612,101,blue);rect(0,684,612,7,orange);cmds.push(`q 131 0 0 ${131*image.height/image.width} 43 717 cm /Logo Do Q`);text('DETALLE DE DESCUENTOS',207,746,16,'1 1 1',true);text(report.employee.slice(0,60),36,654,13,ink,true);text('Ref. '+(report.selectionId||'').slice(-8)+' / '+report.period,36,635,9);rect(36,577,540,42,'0.94 0.97 0.98');text('Descuentos incluidos: '+(report.deductionText||'$0.00'),48,593,14,ink,true);let y=548;items.forEach((d,i)=>{const lines=wrap(d.description||'Retiro / otro monto',65);rect(36,y-56,540,56,i%2?'1 1 1':'0.97 0.98 0.99');lines.slice(0,2).forEach((line,j)=>text(line,47,y-18-j*13,10));text('$'+(d.cents/100).toFixed(2),480,y-22,11,blue,true);text('Movimiento '+d.id.slice(-12),47,y-47,8);y-=61});text('El saldo no incluido permanece pendiente para otro pago.',36,95,9);text('La selección no confirma el pago. Administrador debe liquidarla.',36,79,8);text('Página '+(chunks.length+idx+1)+' de '+pageCount,485,31,8,blue);const stream=cmds.join('\n'),contents=add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);pageIds.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> /XObject << /Logo ${imageId} 0 R >> >> /Contents ${contents} 0 R >>`));});
    objects[catalog] = `<< /Type /Catalog /Pages ${pages} 0 R >>`;
    objects[pages] = `<< /Type /Pages /Kids [${pageIds.map(n=>n+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    let output = '%PDF-1.4\n', offsets = [0];
    for (let i=1;i<objects.length;i++) { offsets[i] = output.length; output += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = output.length;
    output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i=1;i<objects.length;i++) output += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([bytes(output)],{type:'application/pdf'});
  }
    async function buildImage(r){
    const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n),date=n=>new Date(n).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),alloc=r.allocations||[],ded=r.deductions||[],credits=r.returns||[];
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080+alloc.length*114+ded.length*70+credits.length*80;const c=canvas.getContext('2d');c.fillStyle='#fffaf0';c.fillRect(0,0,1080,canvas.height);c.fillStyle='#087eab';c.fillRect(0,0,1080,270);const image=new Image();image.src=new URL('./logo.png',document.baseURI).href;await image.decode();const w=330,h=w*image.height/image.width;c.drawImage(image,64,32,w,h);
    function text(value,x,y,size=28,color='#412b24',weight=500){c.font=weight+' '+size+'px Arial,sans-serif';c.fillStyle=color;c.fillText(String(value),x,y,940)}
    text('REPORTE DE NÓMINA',64,220,32,'#fff',700);text(r.employeeName,64,340,48,'#713e28',700);text('Folio '+r.id.slice(-8)+' · '+new Date(r.createdAt).toLocaleDateString('es-MX'),64,390,25,'#667d86');
    let y=465;text((r.totalMinutes/60).toFixed(2)+' horas seleccionadas',64,y,36,'#087eab',700);y+=65;text('Horas × $50',64,y);text(money(r.grossAmount??r.amount),760,y,30);y+=52;text('Descuentos',64,y);text('− '+money((r.deductionCents||0)/100),760,y,30);y+=52;text('Expendios regresados',64,y);text('+ '+money((r.returnCreditCents||0)/100),760,y,30);y+=38;
    c.fillStyle='#ff6029';c.fillRect(52,y,976,98);text('A PERCIBIR',76,y+61,30,'#fff',700);text(money(r.amount),720,y+64,42,'#fff',700);y+=145;
    if(r.returnRedFlag){text('⚑ DEVOLUCIONES MAYORES AL 15%',64,y,30,'#be2f34',700);y+=50}
    text('TURNOS INCLUIDOS',64,y,27,'#087eab',700);y+=55;
    for(const a of alloc){text(date(a.start)+' → '+date(a.end),64,y,27);y+=36;text((a.minutes/60).toFixed(2)+' h de '+(a.capacityMinutes/60).toFixed(2)+' h'+(a.manualEdited?' · Ajuste manual':''),64,y,24,a.manualEdited?'#a66616':'#667d86');y+=72;c.fillStyle='#e4dfd5';c.fillRect(64,y-35,952,2)}
    if(ded.length){text('DESCUENTOS APLICADOS',64,y,26,'#087eab',700);y+=48;for(const d of ded){text(d.description||'Retiro personal',64,y,24);text(money(d.cents/100),830,y,24);y+=70}}
    if(credits.length){text('ABONOS DE EXPENDIO',64,y,26,'#087eab',700);y+=48;for(const d of credits){text(d.pieces+(d.pieces===1?' pieza · ':' piezas · ')+Math.round(d.totalReturnedPieces/d.issuedPieces*100)+'% del retiro original',64,y,24,d.totalReturnedPieces/d.issuedPieces>.15?'#be2f34':'#412b24');text(money(d.creditCents/100),830,y,24);y+=80}}
    text(r.status==='paid'?'Pago confirmado':'Selección pendiente de pago',64,canvas.height-60,24,'#667d86');return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo crear la imagen.')),'image/png'));
  }

  window.DarkisReport = {build,buildImage};
})();

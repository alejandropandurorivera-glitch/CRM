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
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
    return {width:canvas.width,height:canvas.height,data:atob(canvas.toDataURL('image/jpeg',.92).split(',')[1])};
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
    const imageId = add(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n${image.data}\nendstream`);
    const chunks = []; let chunk = [], used = 0;
    for (const r of report.records) {
      const notes = r.manualEdited ? wrap('Motivo: ' + (r.editReason || 'Sin motivo registrado')) : [];
      const height = r.manualEdited ? 49 + notes.length * 11 : 34;
      if (used + height > 421 && chunk.length) { chunks.push(chunk); chunk = []; used = 0; }
      chunk.push({r,notes,height}); used += height;
    }
    if (chunk.length || !chunks.length) chunks.push(chunk);
    const pageIds = [], date = ms => new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(ms));
    const time = ms => new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
    chunks.forEach((rows, pageIndex) => {
      const commands = [];
      const rect = (x,y,w,h,color) => commands.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
      const text = (value,x,y,size=10,color=ink,heavy=false) => commands.push(`BT /${heavy?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm ${literal(value)} Tj ET`);
      rect(0,691,612,101,blue); rect(0,684,612,7,orange); rect(36,713,145,54,'1 1 1');
      commands.push(`q 131 0 0 ${131*image.height/image.width} 43 717 cm /Logo Do Q`);
      text('REPORTE DE HORARIO',207,746,18,'1 1 1',true);
      text('Darkis Brownies',208,725,11,'1 1 1');
      text('Empleado: ' + report.employee.slice(0,65),36,659,13,ink,true);
      text('Periodo: ' + report.period,36,638,10);
      rect(36,576,540,47,'0.94 0.97 0.98');
      text('HORAS TRABAJADAS',48,607,8,blue,true); text(report.hours.toFixed(2)+' h',48,587,16,ink,true);
      text('TARIFA POR HORA',231,607,8,blue,true); text(report.rateText,231,587,13,ink,true);
      text('IMPORTE ESTIMADO',407,607,8,blue,true); text(report.payText,407,587,13,ink,true);
      text(`${report.records.length} movimientos  |  ${report.records.filter(r=>r.manualEdited).length} manuales`,36,557,9);
      rect(36,525,540,23,blue); text('MOVIMIENTO',46,533,8,'1 1 1',true); text('FECHA',152,533,8,'1 1 1',true); text('HORA',255,533,8,'1 1 1',true); text('ORIGEN DEL REGISTRO',340,533,8,'1 1 1',true);
      let y = 525;
      if (!rows.length) text('Sin movimientos registrados en este periodo.',46,502,10);
      for (const {r,notes,height} of rows) {
        rect(36,y-height,540,height-1,r.manualEdited?'1 0.96 0.90':'0.97 0.98 0.99');
        text(r.type==='entry'?'Entrada':'Salida',46,y-16,10,ink,true); text(date(r.timestamp),152,y-16,10); text(time(r.timestamp),255,y-16,10,ink,true);
        text(r.manualEdited?(r.manualCreated?'AGREGADA MANUALMENTE':'MODIFICADA MANUALMENTE'):'Automático',340,y-16,r.manualEdited?8:9,r.manualEdited?'0.65 0.24 0.06':blue,Boolean(r.manualEdited));
        if (r.manualEdited) {
          text(Number.isFinite(r.originalTimestamp)?'Hora original: '+date(r.originalTimestamp)+' '+time(r.originalTimestamp):'Sin marcación automática original',46,y-32,8);
          notes.forEach((line,i)=>text(line,46,y-44-i*11,8));
        }
        y -= height;
      }
      rect(36,79,540,1,'0.84 0.89 0.91');
      text('Las marcas manuales corresponden únicamente a la entrada o salida señalada.',36,65,8,ink,true);
      text('Horario de Ciudad de México. Turnos abiertos calculados hasta la emisión.',36,51,8);
      text('Emitido: '+date(report.issuedAt)+' '+time(report.issuedAt),36,31,8);
      text(`Página ${pageIndex+1} de ${chunks.length}`,485,31,8,blue);
      const stream = commands.join('\n');
      const contents = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      pageIds.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> /XObject << /Logo ${imageId} 0 R >> >> /Contents ${contents} 0 R >>`));
    });
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
  window.DarkisReport = {build};
})();

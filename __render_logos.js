const sharp = require('sharp');
const fs = require('fs');
const DIR = 'C:/Users/vinic/AppData/Local/Temp/vg_logos';
const concepts = ['c1','c2','c3','c4','c5','c6'];
const sizes = [16,40,128];
async function run(){
  for (const c of concepts){
    const svg = fs.readFileSync(`${DIR}/${c}.svg`);
    for (const s of sizes){
      await sharp(Buffer.from(svg)).resize(s,s).png().toFile(`${DIR}/${c}_${s}.png`);
    }
  }
  const cell=140, pad=18, labelH=0, cols=6, rows=concepts.length;
  const W=cols*cell, H=rows*cell;
  const white={r:255,g:255,b:255}, navy={r:10,g:14,b:22};
  const composites=[];
  for(let r=0;r<rows;r++){
    const c=concepts[r];
    const layout=[{s:16,bg:white},{s:40,bg:white},{s:128,bg:white},{s:16,bg:navy},{s:40,bg:navy},{s:128,bg:navy}];
    for(let col=0;col<cols;col++){
      const {s,bg}=layout[col];
      const png=await sharp(`${DIR}/${c}_${s}.png`).toBuffer();
      const cellImg=await sharp({create:{width:cell,height:cell,channels:3,background:bg}})
        .composite([{input:png,gravity:'center'}]).png().toBuffer();
      composites.push({input:cellImg,left:col*cell,top:r*cell});
    }
  }
  await sharp({create:{width:W,height:H,channels:3,background:{r:200,g:200,b:200}}})
    .composite(composites).png().toFile(`${DIR}/sheet.png`);
  console.log('done',W,H);
}
run().catch(e=>{console.error(e);process.exit(1);});

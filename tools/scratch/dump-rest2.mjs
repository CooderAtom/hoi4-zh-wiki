import fs from 'node:fs';
const dir='data/pageblocks';
const want=['Patch_1.0.X','Patch_1.2.X','Patch_1.8.X','Patches','Political_decisions','Portrait_modding','Posteffect_modding','Reconnaissance','Resources_modding','South_African_events','Soviet_events','Soviet_events_NSB','Soviet_events_NSB_2','Strategic_region_modding','Supply_areas_modding','The_Lion_King','Tutorial_videos','Unit','We_re_Putting_the_Band_Back_Together','West_Germany','Yugoslavian_events'];
for(const w of want){
  const f=dir+'/'+w+'.pr0000.json';
  if(!fs.existsSync(f)){ console.log('MISSING '+w); continue; }
  const b=JSON.parse(fs.readFileSync(f,'utf8'));
  console.log('=== '+w+' ('+b.items.length+') ===');
  for(const it of b.items){
    const seq=[...it.en.matchAll(/\u27E6(\d+)\u27E7/g)].map(m=>m[1]).join(',');
    console.log(it.k+' ['+seq+'] :: '+it.en.replace(/\n/g,' '));
  }
}

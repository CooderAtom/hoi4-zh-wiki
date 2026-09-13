import fs from 'node:fs';
const dir='data/pageblocks';
const want=['Doctrine_modding','Exiled_government_decisions','Formable_nations_Oceania','French_events_LaR','General_events','Generic_decisions','Hearts_of_Iron_4_Wiki','Icelandic_events_AAT','Ironman','Japanese_events','Mexican_events','Mods','Music_modding','Namelist_modding','Naval_technology','Naval_technology_Basic_','Naval_treaty_events','No_more_Partitions','Otto-man'];
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

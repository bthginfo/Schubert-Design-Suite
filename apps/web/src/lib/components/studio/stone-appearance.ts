/** Representative CC0 appearance, separate from the supplier's exact slab photograph. */
export function stoneAppearance(material:any){
 const family=String(material?.properties?.family??'granit'),name=String(material?.name??'').toLowerCase();
 const dark=/nero|black|impala|anthrazit|preto|belvedere|indian black|devil/.test(name),red=/rot|rosa|rainforest brown/.test(name),green=/green|verde/.test(name),blue=/azul|blue|turchese/.test(name),white=/bianco|branco|white|carrara|mont blanc/.test(name);
 const texture=family==='marmor'||family==='onyx'||family==='quarzit'?(white?'Marble019':'Marble012'):['travertin','kalkstein','sandstein'].includes(family)?'Travertine009':red?'Granite006B':'Granite007A';
 const color=dark?'#343b3a':green?'#80927c':blue?'#829aa9':red?'#ca9b83':white?'#f1efea':['travertin','sandstein','kalkstein'].includes(family)?'#d9cbb1':family==='schiefer'?'#626e70':'#b9b8ae';
 return{color,texture,path:'/planning-materials/'+texture+'-color.jpg',roughness:family==='schiefer'?.78:.3};
}

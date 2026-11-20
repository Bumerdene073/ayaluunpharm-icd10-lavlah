const val=(v,n)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const opt=(v,n)=>typeof v==='string'&&v.length<=n;
const id=v=>typeof v==='string'&&/^[a-z0-9_-]{1,40}$/.test(v);
const finiteColor=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const mediaUrl=v=>v===undefined||v===''||(typeof v==='string'&&/^\/api\/media\/[a-f0-9]{32}$/.test(v));
const font=v=>v===undefined||['Inter','Arial','Georgia','Tahoma','Verdana','Trebuchet MS','Times New Roman','Segoe UI'].includes(v);
const within=(v,lo,hi)=>v===undefined||(Number.isInteger(v)&&v>=lo&&v<=hi);
const url=v=>v===''||(typeof v==='string'&&v.length<=1500&&/^https:\/\/[^\s<>"']+$/i.test(v));
function unique(items){return new Set(items).size===items.length;}
export function validateDocument(d) {
 if(!d||typeof d!=='object'||Array.isArray(d))return 'Өгөгдлийн бүтэц буруу.';
 const s=d.settings;
 if(!s||!val(s.title,120)||!opt(s.eyebrow,180)||!opt(s.subtitle,700)||!finiteColor(s.brand)||!finiteColor(s.brand2))return 'Сайтын текст/өнгийн тохиргоо буруу.';
 // Backward compatible: old documents do not contain hero color settings.
 for(const k of ['heroTitleColor','heroSubtitleColor','heroEyebrowColor','heroBadgeColor']){
  if(s[k] !== undefined && !finiteColor(s[k]))return 'Дээд хэсгийн бичвэрийн өнгө буруу.';
 }
 for(const k of ['bodyTextColor','mutedTextColor','categoryTitleColor','categorySubtitleColor','sectionTitleColor','diagnosisTitleColor','linkTextColor','buttonTextColor','footerTextColor']){
  if(s[k] !== undefined && !finiteColor(s[k]))return 'Нийтийн сайтын бичвэрийн өнгө буруу.';
 }
 for(const k of ['logoImage','heroBackgroundImage','pageBackgroundImage']){
  if(!mediaUrl(s[k]))return 'Зургийн холбоос зөвшөөрөгдөөгүй.';
 }
 if(s.uiText!==undefined){
  if(!s.uiText||typeof s.uiText!=='object'||Array.isArray(s.uiText)||Object.keys(s.uiText).length>100)return 'Бичвэрийн талбарын бүтэц буруу.';
  for(const [key,text] of Object.entries(s.uiText))if(!/^[a-zA-Z][a-zA-Z0-9_]{0,50}$/.test(key)||typeof text!=='string'||text.length>2500)return 'Бичвэрийн утга хэт урт эсвэл буруу.';
 }
 if(s.badgeIcons!==undefined){
  if(!s.badgeIcons||typeof s.badgeIcons!=='object'||Array.isArray(s.badgeIcons))return 'Шошгоны icon-ийн өгөгдөл буруу.';
  for(const [key,img] of Object.entries(s.badgeIcons))if(!['indication','context','symptom','nutrition'].includes(key)||!mediaUrl(img))return 'Шошгоны icon холбоос буруу.';
 }
 if(!font(s.fontFamily)||!font(s.headingFontFamily)||!within(s.baseFontSize,12,21)||!within(s.heroTitleSize,22,64)||!within(s.logoWidth,48,360)||!within(s.heroOverlay,0,85))return 'Фонт, хэмжээ эсвэл зурагны тохиргоо буруу.';
 for(const key of ['heroSubtitleFontFamily','eyebrowFontFamily','sectionFontFamily','categoryFontFamily','diagnosisFontFamily','buttonFontFamily','badgeFontFamily','adminFontFamily']){
  if(!font(s[key]))return 'Фонтын сонголт зөвшөөрөгдөөгүй.';
 }
 for(const [key,lo,hi] of [['heroSubtitleSize',11,24],['sectionTitleSize',14,30],['categoryTitleSize',11,22],['diagnosisFontSize',12,22],['buttonFontSize',11,20],['badgeFontSize',9,17]]){
  if(!within(s[key],lo,hi))return 'Үсгийн хэмжээ зөвшөөрөгдөөгүй.';
 }
 if(!Array.isArray(d.categories)||d.categories.length!==9||!unique(d.categories.map(c=>c.id)))return '9 ангилал хэвээр байх ёстой.';
 const expectedIds=['pain','digest','heart','breath','neuro','vitamin','kidney','skin','food'];
 if(!expectedIds.every(k=>d.categories.some(c=>c.id===k)))return 'Ангиллын үндсэн кодыг өөрчлөх боломжгүй.';
 for(const c of d.categories){if(!mediaUrl(c.iconImage)||!val(c.title,260)||!val(c.short,100)||!opt(c.subtitle,200)||!finiteColor(c.color)||!finiteColor(c.bg)||!val(c.icon,24)||!/^[a-z-]{1,24}$/.test(c.icon))return 'Ангиллын мэдээлэл/өнгө буруу.';}
 if(!Array.isArray(d.products)||d.products.length>1000||!unique(d.products.map(p=>p.id)))return 'Бүтээгдэхүүний ID давхардсан эсвэл хэт олон байна.';
 for(const p of d.products){if(!id(p.id)||!d.categories.some(c=>c.id===p.category)||!val(p.name,300)||!url(p.source)||!Number.isInteger(p.page)||p.page<0||p.page>9999)return 'Бүтээгдэхүүний мэдээлэл эсвэл HTTPS холбоос буруу.';}
 if(!Array.isArray(d.diagnoses)||d.diagnoses.length>3000||!unique(d.diagnoses.map(x=>x.cat+'|'+x.code)))return 'Оношийн код давхардсан эсвэл хэт олон байна.';
 const productSet=new Set(d.products.map(p=>p.id));
 for(const x of d.diagnoses){
  if(!d.categories.some(c=>c.id===x.cat)||!val(x.block,80)||!val(x.blockName,250)||!val(x.name,400)||!opt(x.note,2000)||!/^([A-Z]\d{2})(\.\d{1,2})?$/.test(x.code)||!['indication','context','symptom','nutrition'].includes(x.kind)||!Array.isArray(x.products)||x.products.length>100||!unique(x.products)||!x.products.every(p=>productSet.has(p)))return 'Оношийн мэдээлэл, ICD код эсвэл эмийн холбоос буруу.';
 }
 return null;
}

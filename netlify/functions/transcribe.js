exports.handler = async (event) => {
 if(event.httpMethod!=='POST') return {statusCode:405,body:JSON.stringify({error:'Method not allowed'})};
 const key=process.env.OPENAI_API_KEY;
 if(!key)return {statusCode:503,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Glasovna storitev še ni aktivirana. V Netlify dodaj OPENAI_API_KEY.'})};
 try{
  const type=(event.headers['content-type']||'audio/mp4').split(';')[0];
  const bytes=Buffer.from(event.body||'',event.isBase64Encoded?'base64':'utf8');
  if(!bytes.length||bytes.length>3000000)return {statusCode:400,body:JSON.stringify({error:'Neveljaven ali predolg posnetek.'})};
  const ext=type.includes('webm')?'webm':type.includes('mp4')?'mp4':'wav';
  const form=new FormData();
  form.append('file',new Blob([bytes],{type}), 'pikado.'+ext);
  form.append('model','gpt-4o-mini-transcribe');
  form.append('language','sl');
  form.append('prompt','Slovensko izgovorjeno število točk pri pikadu, od nič do sto osemdeset.');
  const resp=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body:form});
  const result=await resp.json();
  if(!resp.ok){const code=result?.error?.code||result?.error?.type||'unknown';const descriptions={invalid_api_key:'API ključ ni veljaven.',insufficient_quota:'Na OpenAI API računu ni razpoložljivega dobroimetja oziroma obračunavanja.',billing_hard_limit_reached:'Dosežena je omejitev porabe OpenAI API.',model_not_found:'Izbrani model ni na voljo za ta API račun.',unsupported_file:'Format zvočnega posnetka ni podprt.',invalid_request_error:'Zahteva za prepoznavanje zvoka ni veljavna.'};return {statusCode:502,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:(descriptions[code]||'Napaka storitve prepoznave')+' (API HTTP '+resp.status+', koda '+String(code).slice(0,80)+')'})}};
  return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({text:result.text||''})};
 }catch(e){return {statusCode:500,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:'Prepoznava ni uspela.'})}}
};
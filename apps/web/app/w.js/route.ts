export const runtime = 'nodejs';

/**
 * One-line embeddable web widget (§9):
 *   <script src="https://panel/w.js" data-key="WEB_CHANNEL_ID"></script>
 * Self-contained vanilla JS — no framework, no external requests except the
 * widget message API on the same origin it was served from.
 */
const WIDGET_JS = `(function(){
  var s=document.currentScript; if(!s) return;
  var key=s.getAttribute('data-key'); if(!key) return;
  var api=new URL(s.src).origin+'/api/widget/message';
  var sid=localStorage.getItem('khodkar_wsid');
  if(!sid){sid='w'+Date.now()+Math.random().toString(36).slice(2);localStorage.setItem('khodkar_wsid',sid);}
  var C='#B07D46',open=false;
  var root=document.createElement('div');root.dir='rtl';
  root.style.cssText='position:fixed;bottom:20px;left:20px;z-index:2147483000;font-family:Tahoma,system-ui,sans-serif';
  document.body.appendChild(root);
  var btn=document.createElement('button');btn.textContent='گفتگو';
  btn.style.cssText='background:'+C+';color:#fff;border:none;border-radius:9999px;padding:12px 20px;font-size:15px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)';
  root.appendChild(btn);
  var panel=document.createElement('div');
  panel.style.cssText='display:none;flex-direction:column;width:320px;height:440px;background:#fff;border:1px solid #eee;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.18)';
  root.appendChild(panel);
  var head=document.createElement('div');head.textContent='دستیار فروش';
  head.style.cssText='background:'+C+';color:#fff;padding:12px 16px;font-weight:bold';panel.appendChild(head);
  var log=document.createElement('div');
  log.style.cssText='flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#faf9f7';panel.appendChild(log);
  var form=document.createElement('form');
  form.style.cssText='display:flex;gap:6px;padding:10px;border-top:1px solid #eee';
  var inp=document.createElement('input');inp.placeholder='پیامت را بنویس…';
  inp.style.cssText='flex:1;border:1px solid #ddd;border-radius:10px;padding:8px 12px;font-size:14px;outline:none';
  var snd=document.createElement('button');snd.type='submit';snd.textContent='ارسال';
  snd.style.cssText='background:'+C+';color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer';
  form.appendChild(inp);form.appendChild(snd);panel.appendChild(form);
  function bubble(text,mine){var b=document.createElement('div');b.textContent=text;
    b.style.cssText='max-width:80%;padding:8px 12px;border-radius:14px;font-size:14px;'+(mine?'align-self:flex-end;background:'+C+';color:#fff':'align-self:flex-start;background:#fff;border:1px solid #eee');
    log.appendChild(b);log.scrollTop=log.scrollHeight;}
  btn.onclick=function(){open=!open;panel.style.display=open?'flex':'none';btn.style.display=open?'none':'block';
    if(open&&!log.childElementCount){bubble('سلام 👋 چطور می‌تونم کمکت کنم؟',false);}};
  form.onsubmit=function(e){e.preventDefault();var t=inp.value.trim();if(!t)return;inp.value='';bubble(t,true);
    fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:key,sessionId:sid,text:t})})
      .then(function(r){return r.json();}).then(function(d){bubble(d&&d.ok?d.reply:'ببخشید، مشکلی پیش آمد.',false);})
      .catch(function(){bubble('ببخشید، الان نتونستم پاسخ بدم.',false);});};
})();`;

export function GET(): Response {
  return new Response(WIDGET_JS, {
    status: 200,
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'access-control-allow-origin': '*',
    },
  });
}

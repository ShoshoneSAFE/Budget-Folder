// S.A.F.E. Render Engine — deriveFields, buildSB, render, renderRev, UI helpers
function deriveFields(){
  D.forEach(d=>{
    // Initialize deptPercentComplete if missing (default = FY_ELAPSED - 10%)
    if(d.deptPercentComplete === undefined) d.deptPercentComplete = parseFloat(Math.max(0, (FY_ELAPSED * 100 - 10)).toFixed(2));
    
    d.p = d.b > 0 ? Math.round(d.v/d.b*100) : 0;
    
    // Earned Budget = budget * % complete (deptPercentComplete is stored as 0-100)
    d.eb = Math.round(d.b * (d.deptPercentComplete / 100));
    
    // Forecasted = earned budget - actual spent
    d.fc = d.eb - d.v;
    
    // Status: compare earned budget vs actual spent (like revenue logic)
    const safety = getSafetyMargin();
    const threshold = d.v * (1 + safety / 100);
    if(d.eb >= threshold) d.s = 'ok';
    else if(d.eb >= d.v) d.s = 'warn';
    else d.s = 'alert';
    d.li.forEach(l=>{ l.p = l.b > 0 ? Math.round(l.v/l.b*100) : 0; l.ov = l.v > l.b; });
  });
  REV.forEach(r=>{ r.p=r.b>0?Math.round(r.v/r.b*100):0; r.c=r.p<30?'#dc2626':r.p<46?'#d97706':'#059669'; r.w=r.p<40; });
}
deriveFields();

// STATE
let tab='all',st='all',sa=false,srch='';
let filterDepts=[];  // array of selected dept IDs
let filterKeywords=[];  // array of keyword strings
const f$=n=>'$'+Math.round(n).toLocaleString('en-US');
const pc=p=>p>80?'#dc2626':p>55?'#d97706':'#059669';
const sb=s=>s==='alert'?'<span class="badge bAl">Alert</span>':s==='warn'?'<span class="badge bWn">Watch</span>':'<span class="badge bOk">On Track</span>';
const dc=s=>s==='alert'?'dot-alert':s==='warn'?'dot-warn':'dot-ok';
const fm={'0001':'fl0001','0019':'fl0019','0002':'fl0002','special':'flSp'};

// DEEP SEARCH: matches dept name OR any line item account/name
function deepSearch(q){
  if(!q) return D;
  const ql=q.toLowerCase();
  const results=[];
  D.forEach(d=>{
    const dMatch=d.name.toLowerCase().includes(ql)||d.num.toLowerCase().includes(ql)||d.fund.includes(ql);
    const liMatches=d.li.filter(l=>l.n.toLowerCase().includes(ql)||l.a.toLowerCase().includes(ql));
    if(dMatch||liMatches.length>0){
      results.push({...d, _liFilter: liMatches.length>0&&!dMatch ? liMatches.map(l=>l.a) : null});
    }
  });
  return results;
}

// FILTER HELPERS
function toggleDeptFilter(deptId){
  const idx=filterDepts.indexOf(deptId);
  if(idx>-1) filterDepts.splice(idx,1);
  else filterDepts.push(deptId);
  renderFilterPills();
  render();
}

function addKeywordFilter(keyword){
  if(keyword.trim()&&!filterKeywords.includes(keyword.trim())){
    filterKeywords.push(keyword.trim());
    renderFilterPills();
    render();
  }
}

function removeFilter(type,value){
  if(type==='dept') filterDepts=filterDepts.filter(d=>d!==value);
  else if(type==='keyword') filterKeywords=filterKeywords.filter(k=>k!==value);
  renderFilterPills();
  render();
}

function resetAllFilters(){
  filterDepts=[];
  filterKeywords=[];
  renderFilterPills();
  render();
}

function renderFilterPills(){
  const pillsContainer=document.getElementById('filterPills');
  if(!pillsContainer) return;
  pillsContainer.innerHTML='';
  
  const hasFilters=filterDepts.length>0||filterKeywords.length>0;
  if(hasFilters){
    const resetBtn=document.createElement('button');
    resetBtn.className='reset-filter-btn';
    resetBtn.style.backgroundColor='#f97316';
    resetBtn.style.color='white';
    resetBtn.style.padding='4px 8px';
    resetBtn.style.borderRadius='4px';
    resetBtn.style.border='none';
    resetBtn.style.cursor='pointer';
    resetBtn.style.fontSize='12px';
    resetBtn.style.marginRight='8px';
    resetBtn.textContent='🔄 Reset All';
    resetBtn.onclick=resetAllFilters;
    pillsContainer.appendChild(resetBtn);
  }
  
  filterDepts.forEach(deptId=>{
    const dept=D.find(d=>d.id===deptId);
    if(dept){
      const pill=document.createElement('div');
      pill.className='filter-pill';
      pill.style.backgroundColor='#f97316';
      pill.style.color='white';
      pill.style.padding='4px 8px';
      pill.style.borderRadius='4px';
      pill.style.display='inline-flex';
      pill.style.alignItems='center';
      pill.style.gap='6px';
      pill.style.marginRight='4px';
      pill.style.fontSize='12px';
      pill.innerHTML=`${dept.name} <span style="cursor:pointer;font-weight:bold;" onclick="removeFilter('dept','${deptId}')">×</span>`;
      pillsContainer.appendChild(pill);
    }
  });
  
  filterKeywords.forEach(kw=>{
    const pill=document.createElement('div');
    pill.className='filter-pill';
    pill.style.backgroundColor='#f97316';
    pill.style.color='white';
    pill.style.padding='4px 8px';
    pill.style.borderRadius='4px';
    pill.style.display='inline-flex';
    pill.style.alignItems='center';
    pill.style.gap='6px';
    pill.style.marginRight='4px';
    pill.style.fontSize='12px';
    pill.innerHTML=`"${kw}" <span style="cursor:pointer;font-weight:bold;" onclick="removeFilter('keyword','${kw}')">×</span>`;
    pillsContainer.appendChild(pill);
  });
}

// BUILD SIDEBAR
function buildSB(){
  Object.values(fm).forEach(id=>{document.getElementById(id).innerHTML='';});
  D.forEach(d=>{
    const el=document.createElement('div');
    el.className='dl';
    el.id='sl'+d.id;
    const isFiltered=filterDepts.includes(d.id);
    el.innerHTML=`<span style="${isFiltered?'color:#f97316;font-weight:bold;':''}">${d.num} · ${d.name}</span><span class="dot ${dc(d.s)}"></span>`;
    el.style.cursor='pointer';
    el.onclick=()=>toggleDeptFilter(d.id);
    document.getElementById(fm[d.fund]||'flSp').appendChild(el);
  });
}

function sbSearch(v){
  const trimmed=v.trim();
  if(trimmed){
    addKeywordFilter(trimmed);
    document.getElementById('filterInput').value='';  // clear input
  }
}

function filterKeydown(e){
  if(e.key==='Enter'){
    sbSearch(e.target.value);
  }
}

function togFund(id,hdr){
  hdr.classList.toggle('open');
  const el=document.getElementById(id);
  el.classList.toggle('open');
}

// TABLE
function getVis(){
  let base=D;
  
  // Apply dept filter (OR logic: if depts selected, show those; if none, show all)
  if(filterDepts.length>0){
    base=base.filter(d=>filterDepts.includes(d.id));
  }
  
  // Apply keyword filters (AND logic: ALL keywords must match in same line item)
  if(filterKeywords.length>0){
    // Filter line items within departments to only show matching ones
    base.forEach(d=>{
      const matchingLineItems=d.li.filter(l=>{
        return filterKeywords.every(kw=>{
          const kwLower=kw.toLowerCase();
          return l.n.toLowerCase().includes(kwLower)||l.a.toLowerCase().includes(kwLower);
        });
      });
      d._liFilter=matchingLineItems.length>0?matchingLineItems.map(l=>l.a):null;
    });
    // Only keep depts that have matching line items
    base=base.filter(d=>d._liFilter!==null);
  }else{
    base.forEach(d=>d._liFilter=null);
  }
  
  // Apply fund and status filters
  base=base.filter(d=>{
    if(tab!=='all'&&d.fund!==tab)return false;
    if(st!=='all'&&d.s!==st)return false;
    return true;
  });
  
  return base;
}

function render(){
  const body=document.getElementById('tbody');
  body.innerHTML='';
  let depts=getVis();
  const tot=depts.length;
  if(!sa)depts=depts.slice(0,12);

  // DYNAMIC TOTALS — calculated from filtered line items if keywords applied
  const vis=getVis();
  let totB=0, totV=0;
  
  vis.forEach(d=>{
    if(filterKeywords.length>0&&d._liFilter){
      // Sum only filtered line items
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li){totB+=li.b;totV+=li.v;}
      });
    }else{
      // Sum full dept
      totB+=d.b;
      totV+=d.v;
    }
  });
  
  const totVar=totB-totV;
  const totPct=totB>0?Math.round(totV/totB*100):0;
  // update summary cards if they exist
  const cB=document.getElementById('mc-totb');if(cB)cB.textContent=f$(totB);
  const cV=document.getElementById('mc-totv');if(cV)cV.textContent=f$(totV);
  const cVar=document.getElementById('mc-totvr');if(cVar)cVar.textContent=f$(totVar);
  const cPct=document.getElementById('mc-totp');if(cPct)cPct.textContent=totPct+'%';
  // update alert counts
  document.getElementById('cntAll').textContent=D.length;
  document.getElementById('cntAlert').textContent=D.filter(d=>d.s==='alert').length;
  document.getElementById('cntWarn').textContent=D.filter(d=>d.s==='warn').length;
  document.getElementById('cntOk').textContent=D.filter(d=>d.s==='ok').length;

  depts.forEach(d=>{
    // Calculate dept totals from filtered line items if keywords applied
    let deptB=d.b, deptV=d.v, deptP=d.p;
    if(filterKeywords.length>0&&d._liFilter){
      deptB=0;
      deptV=0;
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li){deptB+=li.b;deptV+=li.v;}
      });
      deptP=deptB>0?Math.round(deptV/deptB*100):0;
    }
    
    const diff=d.v-(d.pv||0);
    const dstr=(diff>=0?'+':'-')+f$(Math.abs(diff));
    const dc2=diff>5000?'cN':diff<-5000?'cP':'cZ';
    // Forecast column
    const fa=calcForecastedActual(deptV,d.forecastPct);
    const fv=calcForecastedVariance(deptB,deptV,d.forecastPct);
    const fCol=fa!==null
      ?`<span style="font-size:11px;">${f$(fa)}<br><span style="font-size:10px;color:${fv>=0?'#059669':'#dc2626'};">${fv>=0?'▼ Under':'▲ Over'} ${f$(Math.abs(fv))}</span></span>`
      :`<span style="color:#aaa;font-size:10px;">—</span>`;
    const tr=document.createElement('tr');
    tr.className='dr';tr.id=d.id+'-row';
    const fcColor = d.fc >= 0 ? '#059669' : '#dc2626';
    tr.innerHTML=`
      <td><div class="dn">${d.name}</div><div class="df">${d.num} · FUND ${d.fund==='special'?d.num.split(' ')[1]:d.fund}</div></td>
      <td class="mono">${f$(deptB)}</td>
      <td class="mono" style="cursor:pointer;text-decoration:underline;" onclick="editPercentComplete('${d.id}')">${d.deptPercentComplete}%</td>
      <td class="mono">${f$(d.eb)}</td>
      <td class="mono" style="color:${pc(deptP)};">${f$(deptV)}</td>
      <td><span class="cmp ${dc2}">${dstr}</span></td>
      <td class="mono" style="color:${fcColor};">${f$(d.fc)}</td>
      <td><span class="badge" style="background:${d.s==='alert'?'#dc2626':d.s==='warn'?'#d97706':'#059669'};color:white;padding:4px 8px;border-radius:3px;font-size:11px;">${d.s==='alert'?'Alert':d.s==='warn'?'Watch':'On Track'}</span></td>`;
    tr.ondblclick=()=>togDrill(d.id);
    body.appendChild(tr);
    const xr=document.createElement('tr');
    xr.className='xrow';xr.id=d.id+'-x';
    xr.innerHTML=`<td colspan="8" class="xtd"><div class="xi" id="${d.id}-xi"></div></td>`;
    body.appendChild(xr);
  });

  // FILTERED TOTALS ROW
  if(vis.length>0){
    let totEB = 0;
    vis.forEach(d => {
      if(filterKeywords.length > 0 && d._liFilter) {
        // Recalc eb from filtered line items
        let filteredB = 0;
        d._liFilter.forEach(liAcct => {
          const li = d.li.find(l => l.a === liAcct);
          if(li) filteredB += li.b;
        });
        totEB += Math.round(filteredB * (d.deptPercentComplete / 100));
      } else {
        totEB += d.eb;
      }
    });
    const totFC = totEB - totV;
    const fcColor = totFC >= 0 ? '#059669' : '#dc2626';
    const tr=document.createElement('tr');
    tr.style.cssText='background:rgba(26,39,68,.06);font-weight:700;';
    tr.innerHTML=`<td style="font-size:11px;color:var(--navy);">TOTALS (${vis.length} dept${vis.length!==1?'s':''})</td>
      <td class="mono">${f$(totB)}</td><td class="mono">—</td><td class="mono">${f$(totEB)}</td><td class="mono">${f$(totV)}</td>
      <td></td><td class="mono" style="color:${fcColor};">${f$(totFC)}</td><td></td>`;
    body.appendChild(tr);
  }

  const btn=document.getElementById('saBtn');
  btn.style.display=tot<=12?'none':'inline';
  btn.textContent=sa?'Show less ▲':'Show all '+tot+' ▼';
  document.getElementById('tfNote').textContent=`Double-click any row for detail · Showing ${depts.length} of ${tot} · Actuals thru ${ACTUALS_THRU.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${Math.round(FY_ELAPSED*100)}% of FY elapsed`;
  renderRev();
}

function togShowAll(){sa=!sa;render();}

function buildDrill(d){
  const liList = d._liFilter ? d.li.filter(l=>d._liFilter.includes(l.a)) : d.li;
  const drillTotB=liList.reduce((s,l)=>s+l.b,0);
  const drillTotV=liList.reduce((s,l)=>s+l.v,0);
  const drillTotVar=drillTotB-drillTotV;
  const drillTotPct=drillTotB>0?Math.round(drillTotV/drillTotB*100):0;
  
  const rows=liList.map(l=>{
    const lfa=calcForecastedActual(l.v,l.forecastPct);
    const lfv=calcForecastedVariance(l.b,l.v,l.forecastPct);
    const fcCell=lfa!==null?`${f$(lfa)} <span style="color:${lfv>=0?'#059669':'#dc2626'};font-size:10px;">(${lfv>=0?'↓':'↑'}${f$(Math.abs(lfv))})</span>`:'—';
    const notesTxt=l.notes&&l.notes.length?`<div style="font-size:10px;color:#666;margin-top:2px;">📝 ${l.notes[l.notes.length-1].text}</div>`:'';
    return `<tr class="${l.ov?'ov':''}">
      <td>${l.a}</td><td>${l.n}${notesTxt}</td>
      <td>${f$(l.b)}</td><td style="color:${pc(l.p)};">${f$(l.v)}</td>
      <td>${f$(l.b-l.v)}</td>
      <td><div class="pw"><div class="pb" style="width:50px;"><div class="pf" style="width:${Math.min(l.p,100)}%;background:${pc(l.p)};"></div></div>${l.p}%</div></td>
      <td>${fcCell}</td>
    </tr>`;}).join('');
  // dept-level notes
  const dNotes=d.notes&&d.notes.length?d.notes.map(n=>`<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #eee;"><strong>${n.author||'Staff'}</strong> <span style="color:#999;">${n.date}</span> — ${n.text}</div>`).join(''):'<em style="font-size:11px;color:#aaa;">No notes yet.</em>';
  return `<div class="xhdr"><div class="xtitle">${d.name} — Line Item Detail</div><button class="xcls" onclick="closeDrill('${d.id}')">✕ Close</button></div>
  <div class="xsum">
    <div class="xcard"><div class="xclbl">TOTAL BUDGET</div><div class="xcval">${f$(drillTotB)}</div></div>
    <div class="xcard"><div class="xclbl">SPENT TO DATE</div><div class="xcval" style="color:${pc(drillTotPct)};">${f$(drillTotV)}</div></div>
    <div class="xcard"><div class="xclbl">REMAINING</div><div class="xcval">${f$(drillTotB-drillTotV)}</div></div>
  </div>
  <table class="xt"><thead><tr><th>Account</th><th>Description</th><th>Budget</th><th>Actual</th><th>Remaining</th><th>% Used</th><th>Forecasted EOY</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:8px;"><div style="font-size:11px;font-weight:600;color:var(--navy);margin-bottom:4px;">📋 Department Notes</div>${dNotes}</div>
  <div style="margin-top:5px;font-size:10px;color:var(--muted);font-style:italic;">Red rows = over budget. Double-click row again to collapse.</div>`;
}

function togDrill(id){
  const xr=document.getElementById(id+'-x');
  const xi=document.getElementById(id+'-xi');
  const d=D.find(x=>x.id===id);
  xr.classList.contains('open')?(xr.classList.remove('open')):(xi.innerHTML=buildDrill(d),xr.classList.add('open'));
}
function closeDrill(id){document.getElementById(id+'-x').classList.remove('open');}

function jumpTo(id){
  const row=document.getElementById(id+'-row');
  if(!row){tab='all';st='all';sa=true;render();setTimeout(()=>jumpTo(id),150);return;}
  if(!document.getElementById(id+'-x').classList.contains('open'))togDrill(id);
  row.scrollIntoView({behavior:'smooth',block:'center'});
  row.classList.add('hl');setTimeout(()=>row.classList.remove('hl'),2000);
  document.querySelectorAll('.dl').forEach(el=>el.classList.remove('on'));
  const sl=document.getElementById('sl'+id);if(sl)sl.classList.add('on');
}

function setStatus(s,btn){
  st=s;
  document.querySelectorAll('.sfbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');sa=false;render();
  document.getElementById('showLbl').textContent=
    s==='all'?'All Funds · All Departments':s==='alert'?'Alert Departments':s==='warn'?'Watch Departments':'On Track Departments';
}

function switchTab(el,fund){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');tab=fund;sa=false;render();
  document.getElementById('showLbl').textContent=
    fund==='all'?'All Funds · All Departments':fund==='0001'?'Current Expense Fund (0001)':
    fund==='0019'?'Justice Fund (0019)':fund==='0002'?'Road & Bridge (0002)':'Enterprise & Special Funds';
}

function sortDepts(v){
  if(v==='name')D.sort((a,b)=>a.name.localeCompare(b.name));
  else if(v==='phi')D.sort((a,b)=>b.p-a.p);
  else if(v==='plo')D.sort((a,b)=>a.p-b.p);
  else if(v==='bhi')D.sort((a,b)=>b.b-a.b);
  else if(v==='var')D.sort((a,b)=>(b.b-b.v)-(a.b-a.v));
  render();
}

// REVENUE
function getSafetyMargin(){
  const fyStart=new Date(new Date().getFullYear(),9,1);
  const fyEnd=new Date(new Date().getFullYear()+1,8,30);
  const today=new Date();
  const elapsed=(today-fyStart)/(fyEnd-fyStart);
  return Math.max(0,10*(1-elapsed));
}

function getRevStatus(earned,actual){
  const safety=getSafetyMargin();
  const threshold=actual*(1+safety/100);
  if(earned>=threshold)return{color:'#059669',label:'On Track'};
  if(earned>=actual)return{color:'#d97706',label:'Watch'};
  return{color:'#dc2626',label:'Alert'};
}

function getExpenseForRev(revFund){
  return D.filter(d=>d.fund===revFund).reduce((s,d)=>{
    const liList=d._liFilter?d.li.filter(l=>d._liFilter.includes(l.a)):d.li;
    return s+liList.reduce((ls,l)=>ls+l.v,0);
  },0);
}

function renderRev(){
  const revList=REV.filter(r=>{
    if(tab!=='all'&&r.fund!==tab)return false;
    if(srch){
      const q=srch.toLowerCase();
      if(!r.n.toLowerCase().includes(q)&&!r.fund.includes(q))return false;
    }
    return true;
  });
  const fyElapsesPct=Math.round(Math.max(0, FY_ELAPSED*100 - 10));
  let tbody=revList.map(r=>{
    const forecasted=r.b;
    const pctComp=fyElapsesPct;
    const earned=Math.round(forecasted*(pctComp/100));
    const actualSpent=getExpenseForRev(r.fund);
    const forecast=earned-actualSpent;
    const status=getRevStatus(earned,actualSpent);
    return `<tr><td><div class="dn">${r.n}</div><div class="df">${r.fund==='special'?r.n.split('(')[1].slice(0,-1):r.fund}</div></td>
      <td class="mono">${f$(forecasted)}</td>
      <td class="mono">${pctComp}%</td>
      <td class="mono">${f$(earned)}</td>
      <td class="mono">${f$(actualSpent)}</td>
      <td class="mono" style="color:${forecast>=0?'#059669':'#dc2626'};">${f$(forecast)}</td>
      <td><span class="badge" style="background:${status.color};color:white;padding:4px 8px;border-radius:3px;font-size:11px;">${status.label}</span></td></tr>`;
  }).join('');
  document.getElementById('rtbody').innerHTML=tbody;
}

// SPLASH
// Splash functions loaded from splash.js

function editPercentComplete(id){
  const d=D.find(x=>x.id===id);
  if(!d)return;
  const newVal=prompt(`Edit % Complete for ${d.name}\n(current: ${d.deptPercentComplete}%)`,d.deptPercentComplete);
  if(newVal!==null){
    const parsed=parseInt(newVal,10);
    if(!isNaN(parsed)&&parsed>=0&&parsed<=100){
      d.deptPercentComplete=parsed;
      deriveFields();
      render();
    }else{
      alert('Please enter a number between 0 and 100');
    }
  }
}

// PRINT
function doPrint(){
  const vis=getVis();
  const totB=vis.reduce((s,d)=>s+d.b,0);
  const totV=vis.reduce((s,d)=>s+d.v,0);
  const totVar=totB-totV;
  const filterDesc=srch?`Search: "${srch}" · `:'';
  const tabDesc=tab==='all'?'All Funds':tab==='0001'?'Current Expense (0001)':tab==='0019'?'Justice Fund (0019)':tab==='0002'?'Road & Bridge (0002)':'Enterprise & Special Funds';
  const statusDesc=st==='all'?'All Statuses':st==='alert'?'Alert Only':st==='warn'?'Watch Only':'On Track Only';
  document.getElementById('printMeta').innerHTML=
    `${filterDesc}Fund: ${tabDesc} · Status: ${statusDesc} · ${vis.length} departments shown · `+
    `Total Budget: ${f$(totB)} · Actual: ${f$(totV)} · Variance: ${f$(totVar)} · `+
    `Printed: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · `+
    `Actuals through ${ACTUALS_THRU.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} (${Math.round(FY_ELAPSED*100)}% of FY elapsed)`;
  window.print();
}


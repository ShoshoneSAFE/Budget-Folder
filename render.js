// S.A.F.E. Render Engine — deriveFields, buildSB, render, renderRev, UI helpers
function deriveFields(){
  D.forEach(d=>{
    // Initialize deptPercentComplete if missing (default = FY_ELAPSED - 10%)
    if(d.deptPercentComplete === undefined) d.deptPercentComplete = parseFloat(Math.max(0, (FY_ELAPSED * 100 - 10)).toFixed(2));
    
    d.p = d.b > 0 ? Math.round(d.v/d.b*100) : 0;
    
    // Earned Budget = sum of line item EBs if any liPercentComplete set, else dept-level
    const hasLiPct = d.li.some(l=>l.liPercentComplete!==undefined);
    if(hasLiPct){
      d.eb = d.li.reduce((s,l)=>{
        const pct = l.liPercentComplete!==undefined ? l.liPercentComplete : d.deptPercentComplete;
        return s + Math.round(l.b*(pct/100));
      },0);
      d.calcPct = d.b>0 ? Math.round(d.eb/d.b*100) : 0;
    } else {
      d.eb = Math.round(d.b * (d.deptPercentComplete / 100));
      d.calcPct = d.deptPercentComplete;
    }
    
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

// PERSISTENCE — save/load % Complete and notes via localStorage
function savePercentData(){
  try{
    const data={};
    D.forEach(d=>{
      data[d.id]={dp:d.deptPercentComplete,li:{}};
      d.li.forEach((l,i)=>{if(l.liPercentComplete!==undefined)data[d.id].li[i]=l.liPercentComplete;});
      if(d.notes&&d.notes.length)data[d.id].notes=d.notes;
    });
    localStorage.setItem('safe_pct',JSON.stringify(data));
  }catch(e){}
}
function loadPercentData(){
  try{
    const raw=localStorage.getItem('safe_pct');
    if(!raw)return;
    const data=JSON.parse(raw);
    D.forEach(d=>{
      if(data[d.id]){
        if(data[d.id].dp!==undefined)d.deptPercentComplete=data[d.id].dp;
        if(data[d.id].li)Object.keys(data[d.id].li).forEach(i=>{if(d.li[i])d.li[i].liPercentComplete=data[d.id].li[i];});
        if(data[d.id].notes)d.notes=data[d.id].notes;
      }
    });
  }catch(e){}
}
loadPercentData();
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
    const inp=document.getElementById('filterInput');
    if(inp)inp.value='';
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
function getStatusCounts(){
  const counts={alert:{summary:0,detail:0},warn:{summary:0,detail:0},ok:{summary:0,detail:0}};
  D.forEach(d=>{
    const status=d.s==='alert'?'alert':d.s==='warn'?'warn':'ok';
    counts[status].summary++;
    d.li.forEach(l=>{
      const lp=l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete;
      const lEarned=Math.round(l.b*(lp/100));
      const lFC=lEarned-l.v;
      const lStatus=lFC<0?'alert':lFC<(l.b*0.1)?'warn':'ok';
      counts[lStatus].detail++;
    });
  });
  return counts;
}

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
  
  // Build status filters
  const statusContainer=document.getElementById('statusFilters');
  if(statusContainer){
    const counts=getStatusCounts();
    const allCount=D.length;
    const active=st;
    statusContainer.innerHTML=`
      <div class="sfrow${active==='all'?' sfactive':''}" onclick="clearStatusFilter()">All Departments <span class="sfcount">${allCount}</span></div>
      <div class="sfrow sfrow-alert${active==='alert'?' sfactive':''}" onclick="toggleStatusGroup('sfg-alert');setStatusFilter('alert')">
        🔴 Alert <span class="sfcount">${counts.alert.summary+counts.alert.detail}</span> <span class="sfarr" id="sfarr-alert">▶</span>
      </div>
      <div id="sfg-alert" class="sfgroup" style="display:none;">
        <div class="sfrow sfsub${active==='alert-summary'?' sfactive':''}" onclick="setStatusFilter('alert-summary')">↳ Summary Level <span class="sfcount">${counts.alert.summary}</span></div>
        <div class="sfrow sfsub${active==='alert-detail'?' sfactive':''}" onclick="setStatusFilter('alert-detail')">↳ Detail Level <span class="sfcount">${counts.alert.detail}</span></div>
      </div>
      <div class="sfrow sfrow-warn${active==='warn'?' sfactive':''}" onclick="toggleStatusGroup('sfg-warn');setStatusFilter('warn')">
        🟠 Watch/Review <span class="sfcount">${counts.warn.summary+counts.warn.detail}</span> <span class="sfarr" id="sfarr-warn">▶</span>
      </div>
      <div id="sfg-warn" class="sfgroup" style="display:none;">
        <div class="sfrow sfsub${active==='warn-summary'?' sfactive':''}" onclick="setStatusFilter('warn-summary')">↳ Summary Level <span class="sfcount">${counts.warn.summary}</span></div>
        <div class="sfrow sfsub${active==='warn-detail'?' sfactive':''}" onclick="setStatusFilter('warn-detail')">↳ Detail Level <span class="sfcount">${counts.warn.detail}</span></div>
      </div>
      <div class="sfrow sfrow-ok${active==='ok'?' sfactive':''}" onclick="toggleStatusGroup('sfg-ok');setStatusFilter('ok')">
        🟢 On Track <span class="sfcount">${counts.ok.summary+counts.ok.detail}</span> <span class="sfarr" id="sfarr-ok">▶</span>
      </div>
      <div id="sfg-ok" class="sfgroup" style="display:none;">
        <div class="sfrow sfsub${active==='ok-summary'?' sfactive':''}" onclick="setStatusFilter('ok-summary')">↳ Summary Level <span class="sfcount">${counts.ok.summary}</span></div>
        <div class="sfrow sfsub${active==='ok-detail'?' sfactive':''}" onclick="setStatusFilter('ok-detail')">↳ Detail Level <span class="sfcount">${counts.ok.detail}</span></div>
      </div>
    `;
    // Re-open active group if a sub-filter is active
    if(active.includes('-')){
      const grp=active.split('-')[0];
      const el=document.getElementById('sfg-'+grp);
      const arr=document.getElementById('sfarr-'+grp);
      if(el){el.style.display='block';}
      if(arr){arr.textContent='▼';}
    }
  }
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

function clearStatusFilter(){
  st='all';
  document.querySelectorAll('.sfbtn').forEach(b=>b.classList.remove('on'));
  render();
  buildSB();
}
function toggleStatusGroup(id){
  ['sfg-alert','sfg-warn','sfg-ok'].forEach(g=>{
    const el=document.getElementById(g);
    const key=g.replace('sfg-','');
    const arr=document.getElementById('sfarr-'+key);
    if(g===id){
      const open=el&&el.style.display==='block';
      if(el)el.style.display=open?'none':'block';
      if(arr)arr.textContent=open?'▶':'▼';
    }else{
      if(el)el.style.display='none';
      if(arr)arr.textContent='▶';
    }
  });
}

function setStatusFilter(filterType){
  // filterType: 'alert','warn','ok','alert-summary','alert-detail',etc
  st=filterType;
  render();
  buildSB();
}

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
  
  // Apply fund and status filters (including detail-level status)
  base=base.filter(d=>{
    if(tab!=='all'&&d.fund!==tab)return false;
    
    if(st==='all')return true;
    
    // Handle summary-level status filters
    if(st==='alert'||st==='warn'||st==='ok'){
      if(d.s===st)return true;
      // Also include if has matching detail-level status
      const hasMatchingDetail=d.li.some(l=>{
        const lp=l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete;
        const lEarned=Math.round(l.b*(lp/100));
        const lFC=lEarned-l.v;
        const lStatus=lFC<0?'alert':lFC<(l.b*0.1)?'warn':'ok';
        return lStatus===st;
      });
      return hasMatchingDetail;
    }
    
    // Handle detail-level specific filters
    if(st.includes('-summary')||st.includes('-detail')){
      const [statusType,level]=st.split('-');
      if(level==='summary'&&d.s===statusType)return true;
      if(level==='detail'){
        return d.li.some(l=>{
          const lp=l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete;
          const lEarned=Math.round(l.b*(lp/100));
          const lFC=lEarned-l.v;
          const lStatus=lFC<0?'alert':lFC<(l.b*0.1)?'warn':'ok';
          return lStatus===statusType;
        });
      }
      return false;
    }
    
    return true;
  });
  
  return base;
}


function isFullAccess(){
  const r=(sessionStorage.getItem('role')||'').toLowerCase();
  return r==='admin'||r==='commissioner'||r==='clerk';
}
function isDeptAccess(deptId){
  const r=(sessionStorage.getItem('role')||'').toLowerCase();
  const d=sessionStorage.getItem('deptId')||'';
  const depts=(sessionStorage.getItem('deptIds')||'').split(',');
  return isFullAccess()||(r==='department head'||r==='dept_head')&&(d===deptId||depts.includes(deptId));
}
function render(){
  const body=document.getElementById('tbody');
  body.innerHTML='';
  let depts=getVis();
  const tot=depts.length;
  if(!sa)depts=depts.slice(0,12);
  
  // Update "Showing:" label based on selected depts
  const fundLabel=tab==='all'?'All Funds':D.find(d=>d.fund===tab)?`Fund ${tab}`:'Fund';
  let deptLabel='All Departments';
  if(filterDepts.length>0){
    const selectedDepts=D.filter(d=>filterDepts.includes(d.id));
    deptLabel=selectedDepts.map(d=>`${d.num} · ${d.name}`).join(', ');
  }
  const keywordLabel=filterKeywords.length>0?` · Keywords: ${filterKeywords.join(', ')}`:'';
  document.getElementById('showLbl').textContent=`${fundLabel} · ${deptLabel}${keywordLabel}`;

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
  // status counts now in buildSB

  depts.forEach(d=>{
    // Calculate dept totals from filtered line items if keywords applied
    let deptB=d.b, deptV=d.v, deptP=d.p;
    let deptEB=d.eb; // Earned budget
    if(filterKeywords.length>0&&d._liFilter){
      deptB=0;
      deptV=0;
      deptEB=0;
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li){
          deptB+=li.b;
          deptV+=li.v;
          deptEB+=Math.round(li.b*(li.liPercentComplete||d.deptPercentComplete)/100);
        }
      });
      deptP=deptB>0?Math.round(deptV/deptB*100):0;
    }
    
    // % Complete at summary = EB / Budget
    const deptPctComplete=deptB>0?Math.round(deptEB/deptB*100):0;
    
    const diff=filterKeywords.length>0&&d._liFilter
      ? d._liFilter.reduce((s,liAcct)=>{const li=d.li.find(l=>l.a===liAcct);return li?s+(li.v-(li.pv||0)):s;},0)
      : d.v-(d.pv||0);
    const dstr=(diff>=0?'+':'-')+f$(Math.abs(diff));
    const dc2=diff>5000?'cN':diff<-5000?'cP':'cZ';
    // Forecast column
    const fa=calcForecastedActual(deptV,d.forecastPct);
    const fv=calcForecastedVariance(deptB,deptV,d.forecastPct);
    const fCol=fa!==null
      ?`<span style="font-size:11px;">${f$(fa)}<br><span style="font-size:10px;color:${fv>=0?'#059669':'#dc2626'};">${fv>=0?'▼ Under':'▲ Over'} ${f$(Math.abs(fv))}</span></span>`
      :`<span style="color:#aaa;font-size:10px;">—</span>`;
    const deptFC = deptEB - deptV;
    const fcColor = deptFC >= 0 ? '#059669' : '#dc2626';
    const varColor = diff >= 0 ? '#059669' : '#dc2626';
    const tr=document.createElement('tr');
    tr.className='dr';tr.id=d.id+'-row';
    tr.innerHTML=`
      <td><div class="dn">${d.name}</div><div class="df">${d.num} · FUND ${d.fund==='special'?d.num.split(' ')[1]:d.fund}</div></td>
      <td class="mono">${f$(deptB)}</td>
      <td class="mono" style="color:#059669;">${deptPctComplete}%</td>
      <td class="mono" style="color:#059669;">${f$(deptEB)}</td>
      <td class="mono" style="color:#dc2626;">$-${f$(deptV).slice(1)}</td>
      <td class="mono" style="color:${varColor};">${dstr}</td>
      <td class="mono" style="color:${fcColor};">${f$(deptFC)}</td>
      <td><span class="badge" style="background:${d.s==='alert'?'#dc2626':d.s==='warn'?'#d97706':'#059669'};color:white;padding:4px 8px;border-radius:3px;font-size:11px;">${d.s==='alert'?'Alert':d.s==='warn'?'Watch':'On Track'}</span></td>
      <td style="text-align:center;cursor:pointer;" onclick="openDeptNotes('${d.id}')">📝</td>`;
    tr.ondblclick=()=>togDrill(d.id);
    body.appendChild(tr);
    const xr=document.createElement('tr');
    xr.className='xrow';xr.id=d.id+'-x';
    xr.innerHTML=`<td colspan="9" class="xtd"><div class="xi" id="${d.id}-xi"></div></td>`;
    body.appendChild(xr);
  });

  // TOTALS ROW at top — all calcs from filtered line items when filter active
  let topTotB=0, topTotEB=0;
  vis.forEach(d=>{
    if(d._liFilter){
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li){
          topTotB+=li.b;
          const pct=li.liPercentComplete!==undefined?li.liPercentComplete:d.deptPercentComplete;
          topTotEB+=Math.round(li.b*(pct/100));
        }
      });
    }else{
      topTotB+=d.b;
      topTotEB+=d.eb;
    }
  });
  const topTotPct=topTotB>0?Math.round(topTotEB/topTotB*100):0;
  let topTotV=vis.reduce((s,d)=>{
    if(d._liFilter){
      let filteredV=0;
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li)filteredV+=li.v;
      });
      return s+filteredV;
    }else{
      return s+d.v;
    }
  },0);
  const topTotFC=topTotEB-topTotV;
  const topFcColor=topTotFC>=0?'#059669':'#dc2626';
  
  const topTotDiff=vis.reduce((s,d)=>{
    if(d._liFilter){
      let filtV=0,filtPV=0;
      d._liFilter.forEach(liAcct=>{
        const li=d.li.find(l=>l.a===liAcct);
        if(li){filtV+=li.v;filtPV+=(li.pv||0);}
      });
      return s+(filtV-filtPV);
    }else{return s+(d.v-(d.pv||0));}
  },0);
  const topDiffColor=topTotDiff>=0?'#059669':'#dc2626';
  const topDiffStr=(topTotDiff>=0?'+':'-')+f$(Math.abs(topTotDiff));
  
  const topTr=document.createElement('tr');
  topTr.className='totals-row';
  topTr.innerHTML=`<td style="font-size:11px;">TOTALS (${vis.length} dept${vis.length!==1?'s':''})</td>
    <td class="mono">${f$(topTotB)}</td>
    <td class="mono plus">${topTotPct}%</td>
    <td class="mono plus">${f$(topTotEB)}</td>
    <td class="mono red">$-${f$(topTotV).slice(1)}</td>
    <td class="mono plus">${topDiffStr}</td>
    <td class="mono ${topTotFC<0?'red':'plus'}">${f$(topTotFC)}</td>
    <td></td>
    <td></td>`;
  body.insertBefore(topTr,body.firstChild);

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
  
  const rows=liList.map((l,idx)=>{
    const lPct = l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete;
    const lEarned = Math.round(l.b * (lPct / 100));
    const lForecast = lEarned - l.v;
    const lStatus = lForecast < 0 ? 'alert' : lForecast < (l.b * 0.1) ? 'warn' : 'ok';
    const notesTxt=l.notes&&l.notes.length?`<div style="font-size:10px;color:#666;margin-top:2px;">📝 ${l.notes[l.notes.length-1].text}</div>`:'';
    return `<tr class="${l.ov?'ov':''}">
      <td>${l.a}</td>
      <td>${l.n}${notesTxt}</td>
      <td>${f$(l.b)}</td>
      <td id="pct-${d.id}-${idx}" ondblclick="inlinePctEdit('${d.id}',${idx})" style="${isDeptAccess(d.id)?'cursor:pointer;':''}" class="pct-cell"><span>${l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete}%</span></td>
      <td style="color:#059669;">${f$(lEarned)}</td>
      <td style="color:#dc2626;">$-${f$(l.v).slice(1)}</td>
      <td></td>
      <td style="color:${lForecast>=0?'#059669':'#dc2626'};">${f$(lForecast)}</td>
      <td><span class="badge" style="background:${lStatus==='alert'?'#dc2626':lStatus==='warn'?'#d97706':'#059669'};color:white;padding:4px 8px;border-radius:3px;font-size:11px;">${lStatus==='alert'?'Alert':lStatus==='warn'?'Watch':'On Track'}</span></td>
      <td style="text-align:center;cursor:pointer;" onclick="openLineItemNotes('${d.id}',${idx})">📝</td>
    </tr>`;}).join('');
  const dNotes=d.notes&&d.notes.length?d.notes.map(n=>`<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #eee;"><strong>${n.author||'Staff'}</strong> <span style="color:#999;">${n.date}</span> — ${n.text}</div>`).join(''):'<em style="font-size:11px;color:#aaa;">No notes yet.</em>';
  return `<div class="xhdr"><div class="xtitle">${d.name} — Line Item Detail</div><button class="xcls" onclick="closeDrill('${d.id}')">✕ Close</button></div>
  <table class="xt"><thead><tr><th>Account</th><th>Description</th><th>Budget</th><th>% Complete</th><th>Earned Budget</th><th>Expenses</th><th>vs Prior Wk</th><th>Forecasted</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:5px;font-size:10px;color:var(--muted);font-style:italic;">Red rows = over budget. Double-click row again to collapse.</div>`;
}

function togDrill(id){
  const xr=document.getElementById(id+'-x');
  const xi=document.getElementById(id+'-xi');
  const existing=document.querySelector('[id$="-x"].open');
  if(existing&&existing.id!==id+'-x'){
    existing.classList.remove('open');
    document.getElementById(existing.id.replace('-x','-xi')).innerHTML='';
  }
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
  if(!isDeptAccess(id)){alert('Only authorized personnel can edit % Complete.');return;}
  const d=D.find(x=>x.id===id);
  if(!d)return;
  const newVal=prompt(`Edit % Complete for ${d.name}\n(current: ${d.deptPercentComplete}%)`,d.deptPercentComplete);
  if(newVal!==null){
    const parsed=parseInt(newVal,10);
    if(!isNaN(parsed)&&parsed>=0&&parsed<=100){
      d.deptPercentComplete=parsed;
      deriveFields();
      savePercentData();
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

function inlinePctEdit(deptId, liIdx){
  if(!isDeptAccess(deptId))return;
  const d=D.find(x=>x.id===deptId);
  if(!d||!d.li[liIdx])return;
  const l=d.li[liIdx];
  const cell=document.getElementById(`pct-${deptId}-${liIdx}`);
  if(!cell)return;
  const current=l.liPercentComplete!==undefined?l.liPercentComplete:d.deptPercentComplete;
  const input=document.createElement('input');
  input.type='number';input.min=0;input.max=100;input.value=current;
  input.style.cssText='width:60px;padding:4px;border:2px solid #0066cc;border-radius:3px;font-size:14px;text-align:center;';
  const save=()=>{
    const val=parseInt(input.value,10);
    if(isNaN(val)||val<0||val>100){cell.innerHTML=`<span>${current}%</span>`;return;}
    l.liPercentComplete=val;deriveFields();savePercentData();
    cell.innerHTML=`<span>${val}%</span>`;
    const xi=document.getElementById(deptId+'-xi');
    if(xi){xi.innerHTML=buildDrill(d);}
    
    // Update summary row EB and % Complete cells
    const summaryRow=document.getElementById(deptId+'-row');
    if(summaryRow){
      const cells=summaryRow.querySelectorAll('td');
      let newDeptEB=0, newDeptPct=0;
      const liFiltered=d._liFilter?d.li.filter(l=>d._liFilter.includes(l.a)):d.li;
      let totB=0;
      liFiltered.forEach(li=>{
        const pct=li.liPercentComplete!==undefined?li.liPercentComplete:d.deptPercentComplete;
        newDeptEB+=Math.round(li.b*(pct/100));
        totB+=li.b;
      });
      newDeptPct=totB>0?Math.round(newDeptEB/totB*100):0;
      if(cells[2]){cells[2].innerHTML=`<span style="color:#059669;">${newDeptPct}%</span>`;}
      if(cells[3]){cells[3].innerHTML=`<span style="color:#059669;">${f$(newDeptEB)}</span>`;}
    }
    // Update Totals row — sum from D array directly (reliable, no DOM parsing)
    const totalsRow=document.querySelector('tr.totals-row');
    if(totalsRow){
      const vis=getVis();
      let tB=0,tEB=0,tV=0,tDiff=0;
      vis.forEach(dv=>{
        if(dv._liFilter){
          dv._liFilter.forEach(liAcct=>{
            const li=dv.li.find(l=>l.a===liAcct);
            if(li){
              tB+=li.b;
              tV+=li.v;
              tEB+=Math.round(li.b*((li.liPercentComplete!==undefined?li.liPercentComplete:dv.deptPercentComplete)/100));
              tDiff+=(li.v-(li.pv||0));
            }
          });
        }else{
          tB+=dv.b;tV+=dv.v;tEB+=dv.eb;tDiff+=(dv.v-(dv.pv||0));
        }
      });
      const tPct=tB>0?Math.round(tEB/tB*100):0;
      const tFC=tEB-tV;
      const tCells=totalsRow.querySelectorAll('td');
      if(tCells[1]){tCells[1].textContent=f$(tB);}
      if(tCells[2]){tCells[2].textContent=`${tPct}%`;}
      if(tCells[3]){tCells[3].textContent=f$(tEB);}
      if(tCells[4]){tCells[4].textContent=`$-${f$(tV).slice(1)}`;}
      if(tCells[5]){tCells[5].textContent=`${tDiff>=0?'+':'-'}${f$(Math.abs(tDiff))}`;}
      if(tCells[6]){tCells[6].className=`mono ${tFC<0?'red':'plus'}`;tCells[6].textContent=f$(tFC);}
    }
    // Update dept summary Forecasted
    if(summaryRow){
      const cells=summaryRow.querySelectorAll('td');
      const liFiltered=d._liFilter?d.li.filter(l=>d._liFilter.includes(l.a)):d.li;
      let newEB=0,newV=0;
      liFiltered.forEach(li=>{
        const pct=li.liPercentComplete!==undefined?li.liPercentComplete:d.deptPercentComplete;
        newEB+=Math.round(li.b*(pct/100));
        newV+=li.v;
      });
      const newFC=newEB-newV;
      if(cells[6]){cells[6].innerHTML=`<span style="color:${newFC>=0?'#059669':'#dc2626'};">${f$(newFC)}</span>`;}
    }
  };
  input.onblur=save;
  input.onkeydown=(e)=>{if(e.key==='Enter')save();if(e.key==='Escape'){cell.innerHTML=`<span>${current}%</span>`;}};
  cell.innerHTML='';cell.appendChild(input);input.focus();input.select();
}

function openDeptNotes(deptId){
  const d=D.find(x=>x.id===deptId);
  if(!d)return;
  const isAuth=isDeptAccess(deptId);
  const currUser=sessionStorage.getItem('name')||'Staff';
  let notesHtml=d.notes&&d.notes.length?d.notes.map(n=>`<div style="font-size:11px;padding:8px;border-bottom:1px solid #eee;background:#f5f5f5;border-radius:3px;margin-bottom:6px;"><div style="margin-bottom:4px;"><strong>${n.author}</strong> <span style="color:#999;font-size:10px;">${n.date} ${n.time||''}</span></div><div>${n.text}</div></div>`).join(''):'<div style="color:#aaa;padding:10px;">No notes yet</div>';
  const modal=document.createElement('div');
  modal.id='notesModal_'+deptId;
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  const closeBtn=document.createElement('button');
  closeBtn.textContent='✕';
  closeBtn.style.cssText='background:none;border:none;font-size:24px;cursor:pointer;color:#666;';
  closeBtn.onclick=()=>modal.remove();
  
  const content=document.createElement('div');
  content.style.cssText='background:white;border-radius:8px;width:90%;max-width:500px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  content.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
      <h3 style="margin:0;">${d.name} — Notes</h3>
      <button onclick="document.getElementById('notesModal_${deptId}').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;line-height:1;">✕</button>
    </div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:10px;margin-bottom:15px;background:#f9f9f9;">${notesHtml}</div>
    ${isAuth?`<textarea id="newNote_${deptId}" placeholder="Add a note..." style="width:100%;height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:sans-serif;resize:vertical;"></textarea><div style="margin-top:10px;"><button onclick="addDeptNote('${deptId}')" style="padding:8px 16px;background:#059669;color:white;border:none;border-radius:4px;cursor:pointer;width:100%;">Save Note</button></div>`:'<div style="color:#999;font-size:12px;">Only authorized personnel can add notes.</div>'}
  `;
  modal.appendChild(content);
  document.body.appendChild(modal);
  modal.onclick=(e)=>{if(e.target===modal)modal.remove();};
}

function addDeptNote(deptId){
  const d=D.find(x=>x.id===deptId);
  if(!d)return;
  const txt=document.getElementById('newNote_'+deptId).value.trim();
  if(!txt){alert('Note cannot be empty');return;}
  if(!d.notes)d.notes=[];
  const now=new Date();
  const date=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const time=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  d.notes.push({author:sessionStorage.getItem('name')||'Staff',date:date,time:time,text:txt});
  savePercentData();
  document.getElementById('notesModal_'+deptId).remove();
  openDeptNotes(deptId);
}

function openLineItemNotes(deptId, liIdx){
  const d=D.find(x=>x.id===deptId);
  if(!d||!d.li[liIdx])return;
  const l=d.li[liIdx];
  const isAuth=isDeptAccess(deptId);
  let notesHtml=l.notes&&l.notes.length?l.notes.map(n=>`<div style="font-size:11px;padding:8px;border-bottom:1px solid #eee;background:#f5f5f5;border-radius:3px;margin-bottom:6px;"><div style="margin-bottom:4px;"><strong>${n.author}</strong> <span style="color:#999;font-size:10px;">${n.date} ${n.time||''}</span></div><div>${n.text}</div></div>`).join(''):'<div style="color:#aaa;padding:10px;">No notes yet</div>';
  const modal=document.createElement('div');
  modal.id='notesModal_'+deptId+'_'+liIdx;
  modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  
  const content=document.createElement('div');
  content.style.cssText='background:white;border-radius:8px;width:90%;max-width:500px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
  const closeBtn=document.createElement('button');
  closeBtn.textContent='✕';
  closeBtn.style.cssText='background:none;border:none;font-size:24px;cursor:pointer;color:#666;position:absolute;right:15px;top:15px;';
  closeBtn.onclick=()=>modal.remove();
  
  content.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
      <h3 style="margin:0;">${l.n} — Notes</h3>
      <button onclick="document.getElementById('notesModal_${deptId}_${liIdx}').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;line-height:1;">✕</button>
    </div>
    <div style="max-height:300px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:10px;margin-bottom:15px;background:#f9f9f9;">${notesHtml}</div>
    ${isAuth?`<textarea id="newNote_${deptId}_${liIdx}" placeholder="Add a note..." style="width:100%;height:80px;padding:8px;border:1px solid #ddd;border-radius:4px;font-family:sans-serif;resize:vertical;"></textarea><div style="margin-top:10px;"><button onclick="addLineItemNote('${deptId}',${liIdx})" style="padding:8px 16px;background:#059669;color:white;border:none;border-radius:4px;cursor:pointer;width:100%;">Save Note</button></div>`:'<div style="color:#999;font-size:12px;">Only authorized personnel can add notes.</div>'}
  `;
  modal.appendChild(content);
  document.body.appendChild(modal);
  modal.onclick=(e)=>{if(e.target===modal)modal.remove();};
}

function addLineItemNote(deptId, liIdx){
  const d=D.find(x=>x.id===deptId);
  if(!d||!d.li[liIdx])return;
  const l=d.li[liIdx];
  const txt=document.getElementById('newNote_'+deptId+'_'+liIdx).value.trim();
  if(!txt){alert('Note cannot be empty');return;}
  if(!l.notes)l.notes=[];
  const now=new Date();
  const date=now.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const time=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  l.notes.push({author:sessionStorage.getItem('name')||'Staff',date:date,time:time,text:txt});
  savePercentData();
  document.getElementById('notesModal_'+deptId+'_'+liIdx).remove();
  openLineItemNotes(deptId, liIdx);
}

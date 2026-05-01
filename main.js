// S.A.F.E. Main — Fiscal Year config, storage helpers, app init

// FISCAL YEAR CONFIG
const FY_START = new Date('2025-10-01');
const FY_END   = new Date('2026-09-30');
const ACTUALS_THRU = new Date('2026-03-17');
const FY_ELAPSED = Math.min(1, (ACTUALS_THRU - FY_START) / (FY_END - FY_START));

// TOLERANCE BAND
function getTolerance(){ return 0.05 * (1 - FY_ELAPSED); }

// FORECAST STATUS
function forecastStatus(budget, actual, forecastPct){
  if(!forecastPct && forecastPct !== 0) return 'ok';
  const fp = parseFloat(forecastPct)/100;
  const forecastedActual = fp >= 1 ? actual : actual / (1 - fp);
  const forecastedVariance = budget - forecastedActual;
  const tol = getTolerance() * budget;
  if(forecastedVariance < -tol) return 'alert';
  if(Math.abs(forecastedVariance) <= tol) return 'warn';
  return 'ok';
}

// CALC HELPERS
function calcForecastedActual(actual, forecastPct){
  if(forecastPct === '' || forecastPct === null || forecastPct === undefined) return null;
  const fp = parseFloat(forecastPct)/100;
  if(fp >= 1) return actual;
  return actual / (1 - fp);
}
function calcForecastedVariance(budget, actual, forecastPct){
  const fa = calcForecastedActual(actual, forecastPct);
  return fa !== null ? budget - fa : null;
}

// STORAGE
function loadData(){
  try{
    const d=localStorage.getItem('safe_depts');
    const r=localStorage.getItem('safe_rev');
    return {
      D: d ? JSON.parse(d) : JSON.parse(JSON.stringify(DEFAULT_D)),
      REV: r ? JSON.parse(r) : JSON.parse(JSON.stringify(DEFAULT_REV))
    };
  }catch(e){ return {D:JSON.parse(JSON.stringify(DEFAULT_D)),REV:JSON.parse(JSON.stringify(DEFAULT_REV))}; }
}
function saveData(){ localStorage.setItem('safe_depts',JSON.stringify(D)); localStorage.setItem('safe_rev',JSON.stringify(REV)); }

// PRINT
function doPrint(){
  const vis=getVis();
  const totB=vis.reduce((s,d)=>s+d.b,0);
  const totV=vis.reduce((s,d)=>s+d.v,0);
  const totVar=totB-totV;
  const filterDesc=srch?'Search: "'+srch+'" · ':'';
  const tabDesc=tab==='all'?'All Funds':tab==='0001'?'Current Expense (0001)':tab==='0019'?'Justice Fund (0019)':tab==='0002'?'Road & Bridge (0002)':'Enterprise & Special Funds';
  const statusDesc=st==='all'?'All Statuses':st==='alert'?'Alert Only':st==='warn'?'Watch Only':'On Track Only';
  document.getElementById('printMeta').innerHTML=
    filterDesc+'Fund: '+tabDesc+' · Status: '+statusDesc+' · '+vis.length+' departments shown · '+
    'Total Budget: '+f+' · Actual: '+f+' · Variance: '+f+' · '+
    'Printed: '+new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})+' · '+
    'Actuals through '+ACTUALS_THRU.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})+' ('+Math.round(FY_ELAPSED*100)+'% of FY elapsed)';
  window.print();
}

// LIVE DATA ARRAYS
let {D,REV} = loadData();


'use strict';
const byId = id => document.getElementById(id);
function issueLink(number) {
  const link = document.createElement('a');
  link.href = 'https://github.com/openai/codex/issues/' + number;
  link.textContent = '#' + number;
  return link;
}
function run(data) {
  const picked = new Set(data.tags);
  const tagInputs = [];
  let limit = 10;
  function showCounts() {
    let memberships = 0;
    const reports = data.issues.filter(([, tags]) => {
      const n = tags.filter(tag => picked.has(tag)).length;
      memberships += n;
      return n > 0;
    });
    byId('count-result').textContent = reports.length + ' distinct reports · ' + memberships + ' selected label memberships';
    const list = byId('issue-list');
    list.replaceChildren();
    for (const [number, labels] of reports.slice(0, limit)) {
      const item = document.createElement('li');
      item.append(issueLink(number), ' · ' + labels.join(', '));
      list.append(item);
    }
    byId('more').hidden = reports.length <= limit;
  }
  for (const tag of data.tags) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    input.value = tag;
    input.addEventListener('change', () => {
      if (input.checked) picked.add(tag); else picked.delete(tag);
      limit = 10;
      showCounts();
    });
    const label = document.createElement('label');
    label.append(input, tag);
    byId('tags').append(label);
    tagInputs.push(input);
  }
  function chooseAll(checked) {
    picked.clear();
    for (const input of tagInputs) {
      input.checked = checked;
      if (checked) picked.add(input.value);
    }
    limit = 10;
    showCounts();
  }
  byId('all').onclick = () => chooseAll(true);
  byId('clear').onclick = () => chooseAll(false);
  byId('more').onclick = () => { limit += 20; showCounts(); };

  const oldest = [...data.cases].sort((a, b) => a.oldest - b.oldest);
  function tier(c, browserWorks) {
    if (c.impact === 'Blocked') return c.workaround === 'Confirmed' || (browserWorks && c.number === 58631) ? 2 : 1;
    return c.impact === 'Degraded' ? 3 : 4;
  }
  function order(b) {
    return [...oldest].sort((x,y) => tier(x,b)-tier(y,b) || x.oldest-y.oldest).slice(0,5);
  }
  function fillOrder(id, cases) {
    const list = byId(id);
    list.replaceChildren();
    for (const c of cases) {
      const item = document.createElement('li');
      item.append(issueLink(c.number),' '+c.task);
      list.append(item);
    }
  }
  const first = oldest.slice(0,5);
  function showOrder() {
    const toggle = byId('browser-works').checked;
    const priority = order(toggle);
    fillOrder('priority',priority);
    const moves = priority.filter(c=>!first.includes(c)).length;
    const enter = priority.filter(c=>!order(false).includes(c));
    const leave = order(false).filter(c=>!priority.includes(c));
    byId('change').textContent = toggle && enter.length
      ? 'With that assumption, #' + enter[0].number + ' enters the first 5 and #' + leave[0].number + ' leaves.'
      : moves + ' of the first 5 change when I prioritize evidence of a blocked task.';
  }
  fillOrder('oldest',first);
  byId('browser-works').onchange = showOrder;
  const select = byId('issue-select');
  for (const c of oldest) select.add(new Option('#'+c.number+' · '+c.task,String(c.number)));
  function details() {
    const c=oldest.find(row=>row.number===Number(select.value));
    const area=byId('case-detail');
    area.replaceChildren();
    for (const [label,text] of [['Reported',c.evidence],['Open question',c.question],['Next action',c.action],['Suggested owner',c.owner]]) {
      const line=document.createElement('p'), strong=document.createElement('strong');
      strong.textContent=label+'. ';line.append(strong,text);area.append(line);
    }
    area.append(issueLink(c.number));
  }
  select.onchange=details;
  showCounts();showOrder();details();
  const later=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date(data.observed_at));
  byId('movement').textContent='By '+later+' (New York time), the same '+data.cohort.toLocaleString('en-US')+' reports contained '+data.selected_now+' open bugs with a selected label, compared with '+data.issues.length+' on November 14. '+data.entered.length+' entered the selection and '+data.left.length+' left it. Of those that left, '+data.exited_closed+' were closed and '+(data.left.length-data.exited_closed)+' stayed open with different labels.';
  const movement=byId('movement-ids');
  for (const [label,ids] of [['Entered',data.entered],['Left',data.left]]) {
    movement.append(label+' ');
    ids.forEach((id,i)=>{if(i) movement.append(', ');movement.append(issueLink(id));});
    movement.append('. ');
  }
  for(const id of ['counts','triage','refresh']) byId(id).hidden=false;
  byId('load-status').hidden=true;
}
fetch('./case.json').then(r=>{if(!r.ok) throw Error();return r.json();}).then(run).catch(()=>{
  byId('load-status').textContent='The interactive data could not load. Reload to try again or download the decision brief below.';
});

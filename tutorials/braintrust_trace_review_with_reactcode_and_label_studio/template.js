function TraceAnnotator({ React, addRegion, regions, data }) {
  var h = React.createElement;
  var useState = React.useState;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;

  /* ── colours ───────────────────────────────────────────────── */
  var C = {
    bg0: '#121110', bg1: '#1e1d1a', bg2: '#262522', bgHov: '#45433e',
    brd: '#45433e',
    txt: '#f9f8f6', txtSec: '#e1ded5', txtMut: '#a49f95',
    pri: '#617ada', pos: '#34988d', neg: '#cc5e46', warn: '#e69559',
    user: '#617ada', asst: '#34988d', tool: '#e69559', system: '#a855f7',
    pass: '#34988d', fail: '#cc5e46',
    sevCrit: '#cc5e46', sevMaj: '#e69559', sevMin: '#617ada', sevSug: '#34988d',
  };

  /* ── failure taxonomy (simplified for agent debugging) ─────── */
  var TAXONOMY = {
    retrieval: { label: 'Retrieval / Grounding', items: [
      { id: 'rt_wrong_source', label: 'Wrong source' },
      { id: 'rt_missing_context', label: 'Missing context' },
      { id: 'rt_outdated', label: 'Outdated information' },
    ]},
    tool_usage: { label: 'Tool Usage', items: [
      { id: 'tu_wrong_tool', label: 'Wrong tool selected' },
      { id: 'tu_wrong_params', label: 'Wrong parameters' },
      { id: 'tu_should_use', label: 'Should have used tool' },
      { id: 'tu_ignored_result', label: 'Ignored tool result' },
    ]},
    reasoning: { label: 'Reasoning', items: [
      { id: 'rs_flawed', label: 'Flawed logic' },
      { id: 'rs_assumption', label: 'Wrong assumption' },
      { id: 'rs_edge_case', label: 'Missed edge case' },
    ]},
    response: { label: 'Response Quality', items: [
      { id: 'rq_incomplete', label: 'Incomplete answer' },
      { id: 'rq_verbose', label: 'Too verbose' },
      { id: 'rq_hallucination', label: 'Hallucination' },
      { id: 'rq_off_topic', label: 'Off-topic' },
    ]},
  };

  var SEVERITIES = [
    { id: 'critical', label: 'Critical', color: C.sevCrit },
    { id: 'major',    label: 'Major',    color: C.sevMaj },
    { id: 'minor',    label: 'Minor',    color: C.sevMin },
    { id: 'suggestion', label: 'Suggestion', color: C.sevSug },
  ];

  /* ── data access ───────────────────────────────────────────── */
  var trace = (data && data.data) ? data.data : (data || {});
  var traceId = trace.trace_id || trace.session_id || 'unknown';
  var source = (trace.metadata && trace.metadata.source) || '';
  var turns = trace.turns || [];

  /* ── state ─────────────────────────────────────────────────── */
  var _selIdx = useState(null);      var selIdx = _selIdx[0];        var setSelIdx = _selIdx[1];
  var _expanded = useState({});      var expanded = _expanded[0];    var setExpanded = _expanded[1];
  var _verdict = useState(null);     var verdict = _verdict[0];      var setVerdict = _verdict[1];
  var _failures = useState([]);      var failures = _failures[0];    var setFailures = _failures[1];
  var _severity = useState(null);    var severity = _severity[0];    var setSeverity = _severity[1];
  var _expected = useState('');      var expected = _expected[0];     var setExpected = _expected[1];
  var _comments = useState('');      var comments = _comments[0];    var setComments = _comments[1];
  var _feedback = useState(null);    var feedback = _feedback[0];    var setFeedback = _feedback[1];
  var _traceVerdict = useState(null); var traceVerdict = _traceVerdict[0]; var setTraceVerdict = _traceVerdict[1];

  /* ── annotation map: turn_id → region ──────────────────────── */
  var annoMap = useMemo(function() {
    var m = {};
    regions.forEach(function(r) {
      if (r.value && r.value.turn_id) m[r.value.turn_id] = r;
      if (r.value && r.value.turn_id === '__trace__') m['__trace__'] = r;
    });
    return m;
  }, [regions]);

  var selTurn = selIdx !== null ? turns[selIdx] : null;

  /* ── handlers ──────────────────────────────────────────────── */
  var loadAnno = useCallback(function(turn) {
    var ex = turn && turn.turn_id && annoMap[turn.turn_id];
    if (ex && ex.value) {
      setVerdict(ex.value.verdict || null);
      setFailures(ex.value.failure_modes || []);
      setSeverity(ex.value.severity || null);
      setExpected(ex.value.expected_behavior || '');
      setComments(ex.value.comments || '');
    } else {
      setVerdict(null); setFailures([]); setSeverity(null); setExpected(''); setComments('');
    }
  }, [annoMap]);

  var selectTurn = useCallback(function(i) {
    setSelIdx(i); setFeedback(null); loadAnno(turns[i]);
  }, [turns, loadAnno]);

  var toggleCat = useCallback(function(id) {
    setExpanded(function(p) { var n = {}; for (var k in p) n[k] = p[k]; n[id] = !p[id]; return n; });
  }, []);

  var toggleFailure = useCallback(function(id) {
    setFailures(function(p) { return p.indexOf(id) >= 0 ? p.filter(function(x){return x!==id;}) : p.concat([id]); });
  }, []);

  var save = useCallback(function() {
    if (!selTurn) return;
    var tid = selTurn.turn_id;
    var val = {
      trace_id: traceId,
      turn_id: tid,
      turn_role: selTurn.role || 'unknown',
      verdict: verdict || '',
      failure_modes: failures,
      severity: severity || '',
      expected_behavior: expected,
      comments: comments,
    };
    var parts = [tid];
    if (verdict) parts.push(verdict.toUpperCase());
    if (severity) parts.push(severity);
    if (failures.length) parts.push(failures.length + ' issues');
    var ex = annoMap[tid];
    if (ex) ex.update(val); else addRegion(val, { displayText: parts.join(' | ') });
    setFeedback(ex ? 'Updated' : 'Saved');
    setTimeout(function() { setFeedback(null); }, 2000);
  }, [selTurn, traceId, verdict, failures, severity, expected, comments, annoMap, addRegion]);

  var reset = useCallback(function() {
    if (!selTurn) return;
    var ex = annoMap[selTurn.turn_id];
    if (ex) {
      ex.delete();
      setVerdict(null); setFailures([]); setSeverity(null); setExpected(''); setComments('');
      setFeedback('Reset');
      setTimeout(function(){setFeedback(null);}, 2000);
    }
  }, [selTurn, annoMap]);

  var saveTraceVerdict = useCallback(function(v) {
    setTraceVerdict(v);
    var val = { trace_id: traceId, turn_id: '__trace__', turn_role: 'trace', verdict: v, failure_modes: [], severity: '', expected_behavior: '', comments: '' };
    var ex = annoMap['__trace__'];
    if (ex) ex.update(val); else addRegion(val, { displayText: 'TRACE: ' + v });
  }, [traceId, annoMap, addRegion]);

  /* ── helpers ───────────────────────────────────────────────── */
  var trunc = function(s, n) { return !s ? '' : s.length <= n ? s : s.slice(0, n) + '...'; };
  var fmtNum = function(n) { return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n); };
  var roleColor = function(r) { return r === 'user' ? C.user : r === 'tool' ? C.tool : r === 'system' ? C.system : C.asst; };
  var roleLabel = function(r) { return (r || 'assistant').toUpperCase(); };
  var sevColor = function(s) { var l = SEVERITIES.find(function(x){return x.id===s;}); return l ? l.color : C.txtMut; };

  /* ── styles ────────────────────────────────────────────────── */
  var S = {
    root: { fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', fontSize: '13px', lineHeight: 1.5, background: C.bg0, color: C.txt, height: 'calc(100vh - 120px)', minHeight: '600px', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: '1px solid '+C.brd },
    header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: C.bg1, borderBottom: '1px solid '+C.brd, flexShrink: 0 },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    leftPanel: { width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', borderRight: '1px solid '+C.brd, background: C.bg0 },
    centerPanel: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: '400px', background: C.bg0 },
    rightPanel: { display: 'flex', flexDirection: 'column', background: C.bg1, minWidth: '260px', maxWidth: '320px', borderLeft: '1px solid '+C.brd },
    panelHead: { padding: '8px 12px', background: C.bg1, borderBottom: '1px solid '+C.brd, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: C.txtMut, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    list: { flex: 1, overflowY: 'auto', padding: '6px' },
    empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.txtMut, fontSize: '13px' },
    detail: { flex: 1, overflowY: 'auto', padding: '16px' },
    form: { flex: 1, overflowY: 'auto', padding: '12px' },
    code: { background: C.bg2, border: '1px solid '+C.brd, borderRadius: '4px', padding: '10px', fontFamily: 'SF Mono,Consolas,Monaco,monospace', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '400px', overflowY: 'auto', marginTop: '6px' },
    badge: { fontSize: '9px', padding: '2px 5px', borderRadius: '3px', background: C.bgHov, color: C.txtSec },
    btn: { padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid '+C.brd, borderRadius: '4px', background: C.bg2, color: C.txt, cursor: 'pointer' },
    textarea: { width: '100%', minHeight: '60px', padding: '8px', fontSize: '12px', fontFamily: 'SF Mono,Consolas,Monaco,monospace', background: C.bg0, border: '1px solid '+C.brd, borderRadius: '4px', color: C.txt, resize: 'vertical', boxSizing: 'border-box' },
    summaryBar: { display: 'flex', gap: '24px', padding: '8px 16px', background: C.bg1, borderTop: '1px solid '+C.brd, fontSize: '11px', flexShrink: 0, alignItems: 'center' },
    label: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: C.txtMut, display: 'block', marginBottom: '6px' },
  };

  /* ── TURNS LIST (left panel) ───────────────────────────────── */
  var renderTurnsList = function() {
    if (!turns.length) return h('div', {style: S.empty}, 'No turns');
    return turns.map(function(turn, i) {
      var isSel = selIdx === i;
      var anno = turn.turn_id && annoMap[turn.turn_id];
      var rc = roleColor(turn.role);
      var hasTools = turn.tool_calls && turn.tool_calls.length > 0;
      var turnVerdict = anno && anno.value && anno.value.verdict;

      var borderLeftColor = 'transparent';
      if (turnVerdict === 'pass') borderLeftColor = C.pass;
      else if (turnVerdict === 'fail') borderLeftColor = C.fail;
      else if (anno) borderLeftColor = sevColor(anno.value && anno.value.severity);

      var turnStyle = {
        marginBottom: '4px', border: '1px solid '+C.brd,
        borderLeft: '3px solid '+borderLeftColor,
        borderRadius: '6px', background: isSel ? C.bg2 : C.bg1,
        cursor: 'pointer', transition: 'background 0.15s',
      };

      var roleBadge = h('span', {style: {fontSize:'10px',fontWeight:600,textTransform:'uppercase',padding:'2px 6px',borderRadius:'3px',background:rc,color:C.bg0}}, roleLabel(turn.role));

      var badges = [];
      if (turn.role === 'tool' && turn.tool_name) {
        badges.push(h('span', {key:'tn', style: Object.assign({}, S.badge, {background:'rgba(230,149,89,0.2)',color:C.tool})}, turn.tool_name));
      }
      if (hasTools) {
        turn.tool_calls.forEach(function(tc, j) {
          badges.push(h('span', {key:'tc'+j, style: Object.assign({}, S.badge, {background:'rgba(230,149,89,0.2)',color:C.tool})}, tc.tool_name));
        });
      }
      if (turnVerdict === 'pass') badges.push(h('span', {key:'v', style: Object.assign({}, S.badge, {background:'rgba(52,152,141,0.3)',color:C.pass})}, 'pass'));
      else if (turnVerdict === 'fail') badges.push(h('span', {key:'v', style: Object.assign({}, S.badge, {background:'rgba(204,94,70,0.3)',color:C.fail})}, 'fail'));

      var preview = trunc((turn.content || '').replace(/\n/g, ' '), 55);

      return h('div', {key: turn.turn_id || i, style: turnStyle, onClick: function(){selectTurn(i);}},
        h('div', {style: {display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px'}},
          roleBadge,
          h('div', {style: {display:'flex',gap:'4px',marginLeft:'auto',flexWrap:'wrap'}}, badges)),
        h('div', {style: {padding:'0 8px 6px 8px',fontSize:'12px',color:C.txtSec,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}, preview));
    });
  };

  /* ── DETAIL (center panel) ─────────────────────────────────── */
  var renderDetail = function() {
    if (!selTurn) return h('div', {style: S.empty}, 'Select a turn to view details');
    var sections = [];

    // Content
    if (selTurn.content) {
      sections.push(h('div', {key:'content', style:{marginBottom:'16px'}},
        h('div', {style: S.label}, 'Content'),
        h('div', {style: S.code}, selTurn.content)));
    }

    // Tool calls (on assistant turns that invoked tools)
    if (selTurn.tool_calls && selTurn.tool_calls.length > 0) {
      sections.push(h('div', {key:'tools', style:{marginBottom:'16px'}},
        h('div', {style: S.label}, 'Tool Calls ('+selTurn.tool_calls.length+')'),
        selTurn.tool_calls.map(function(tc, i) {
          return h('div', {key:i, style:{marginBottom:'10px',border:'1px solid '+C.brd,borderRadius:'6px',overflow:'hidden'}},
            h('div', {style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',background:C.bg2,borderBottom:'1px solid '+C.brd}},
              h('span', {style:{fontWeight:600,color:C.tool,fontFamily:'SF Mono,Consolas,Monaco,monospace'}}, tc.tool_name)),
            h('div', {style:{padding:'8px 10px'}},
              h('div', {style:{fontSize:'10px',fontWeight:600,textTransform:'uppercase',color:C.txtMut,marginBottom:'4px'}}, 'Input'),
              h('div', {style:{fontFamily:'SF Mono,Consolas,Monaco,monospace',fontSize:'11px',background:C.bg0,borderRadius:'3px',padding:'8px',maxHeight:'200px',overflowY:'auto',whiteSpace:'pre-wrap'}},
                typeof tc.input === 'object' ? JSON.stringify(tc.input, null, 2) : String(tc.input || ''))));
        })));
    }

    // Tool input (on tool turns — show what was passed to the tool)
    if (selTurn.role === 'tool' && selTurn.tool_input) {
      sections.push(h('div', {key:'tool_input', style:{marginBottom:'16px'}},
        h('div', {style: S.label}, 'Tool Input'),
        h('div', {style: Object.assign({}, S.code, {fontSize:'11px'})}, selTurn.tool_input)));
    }

    // Token usage
    if (selTurn.usage) {
      var u = selTurn.usage;
      var inTok = u.input_tokens || u.inputTokens || 0;
      var outTok = u.output_tokens || u.outputTokens || 0;
      if (inTok || outTok) {
        sections.push(h('div', {key:'usage', style:{marginBottom:'16px'}},
          h('div', {style: S.label}, 'Token Usage'),
          h('div', {style:{display:'flex',gap:'8px'}},
            h('div', {style:{background:C.bg2,borderRadius:'4px',padding:'8px 16px',textAlign:'center'}},
              h('div', {style:{fontFamily:'monospace',fontWeight:600}}, fmtNum(inTok)),
              h('div', {style:{fontSize:'9px',color:C.txtMut}}, 'Input')),
            h('div', {style:{background:C.bg2,borderRadius:'4px',padding:'8px 16px',textAlign:'center'}},
              h('div', {style:{fontFamily:'monospace',fontWeight:600}}, fmtNum(outTok)),
              h('div', {style:{fontSize:'9px',color:C.txtMut}}, 'Output')))));
      }
    }

    // Model
    if (selTurn.model) {
      sections.push(h('div', {key:'model', style:{marginBottom:'16px'}},
        h('div', {style: S.label}, 'Model'),
        h('div', {style:{fontSize:'12px',color:C.txtSec,fontFamily:'SF Mono,Consolas,Monaco,monospace'}}, selTurn.model)));
    }

    return h('div', null, sections);
  };

  /* ── ANNOTATION FORM (right panel) ─────────────────────────── */
  var renderForm = function() {
    if (!selTurn) return h('div', {style: S.empty}, 'Select a turn to annotate');
    var tid = selTurn.turn_id;
    var existing = tid && annoMap[tid];

    return h('div', {style: S.form},
      // Context header
      h('div', {style:{marginBottom:'12px',padding:'8px',background:C.bg0,borderRadius:'4px'}},
        h('div', {style:{fontSize:'12px',color:roleColor(selTurn.role),fontWeight:600}}, roleLabel(selTurn.role) + ' turn'),
        h('div', {style:{fontSize:'11px',color:C.txtMut,marginTop:'2px'}}, trunc(tid || '', 20))),

      // ── Pass / Fail toggle ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Verdict'),
        h('div', {style:{display:'flex',gap:'6px'}},
          h('button', {
            style: Object.assign({}, S.btn, {flex:1, background: verdict==='pass' ? C.pass : C.bg2, color: verdict==='pass' ? C.bg0 : C.txtSec, borderColor: verdict==='pass' ? C.pass : C.brd, fontWeight: 600}),
            onClick: function(){ setVerdict(verdict==='pass' ? null : 'pass'); }
          }, 'Pass'),
          h('button', {
            style: Object.assign({}, S.btn, {flex:1, background: verdict==='fail' ? C.fail : C.bg2, color: verdict==='fail' ? '#fff' : C.txtSec, borderColor: verdict==='fail' ? C.fail : C.brd, fontWeight: 600}),
            onClick: function(){ setVerdict(verdict==='fail' ? null : 'fail'); }
          }, 'Fail'))),

      // ── Failure details (only shown when verdict is "fail") ──
      verdict === 'fail' && h('div', null,
        // Failure Modes
        h('div', {style:{marginBottom:'14px'}},
          h('label', {style: S.label}, 'Failure Category'),
          h('div', {style:{background:C.bg0,border:'1px solid '+C.brd,borderRadius:'4px',padding:'6px',maxHeight:'220px',overflowY:'auto'}},
            Object.keys(TAXONOMY).map(function(catId) {
              var cat = TAXONOMY[catId];
              var isExp = expanded[catId];
              var selCount = cat.items.filter(function(it){return failures.indexOf(it.id)>=0;}).length;
              return h('div', {key: catId, style:{marginBottom:'2px'}},
                h('div', {style:{display:'flex',alignItems:'center',gap:'6px',padding:'4px 6px',cursor:'pointer',borderRadius:'3px',fontSize:'12px',color:C.txtSec,background:isExp?C.bg2:'transparent'}, onClick:function(){toggleCat(catId);}},
                  h('span', {style:{fontSize:'10px',width:'12px'}}, isExp ? '\u2212' : '+'),
                  h('span', null, cat.label),
                  selCount > 0 && h('span', {style:Object.assign({},S.badge,{marginLeft:'auto',background:'rgba(204,94,70,0.2)',color:C.fail})}, selCount)),
                isExp && h('div', {style:{paddingLeft:'18px'}},
                  cat.items.map(function(item) {
                    var checked = failures.indexOf(item.id) >= 0;
                    return h('div', {key:item.id, style:{display:'flex',alignItems:'center',gap:'6px',padding:'3px 6px',cursor:'pointer',borderRadius:'3px',fontSize:'11px',color:C.txt,background:checked?C.bgHov:'transparent'}, onClick:function(){toggleFailure(item.id);}},
                      h('input', {type:'checkbox', checked:checked, onChange:function(){}, style:{width:'14px',height:'14px',cursor:'pointer'}}),
                      h('span', null, item.label));
                  })));
            }))),

        // Severity
        h('div', {style:{marginBottom:'14px'}},
          h('label', {style: S.label}, 'Severity'),
          h('div', {style:{display:'flex',gap:'6px',flexWrap:'wrap'}},
            SEVERITIES.map(function(lv) {
              var sel = severity === lv.id;
              return h('button', {key:lv.id, style:Object.assign({}, S.btn, {background:sel?lv.color:C.bg2, color:sel?C.bg0:C.txtSec, borderColor:sel?lv.color:C.brd, padding:'5px 10px', fontSize:'11px'}), onClick:function(){setSeverity(severity===lv.id?null:lv.id);}}, lv.label);
            }))),

        // Expected Behavior
        h('div', {style:{marginBottom:'14px'}},
          h('label', {style: S.label}, 'Expected Behavior'),
          h('textarea', {style: S.textarea, value: expected, onChange: function(e){setExpected(e.target.value);}, placeholder: 'What should the agent have done instead?'})),
      ),

      // ── Comments (always visible) ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Comments'),
        h('textarea', {style: S.textarea, value: comments, onChange: function(e){setComments(e.target.value);}, placeholder: 'Additional notes...'})),

      // ── Actions ──
      h('div', {style:{display:'flex',gap:'6px'}},
        h('button', {style:Object.assign({},S.btn,{background:C.pos,borderColor:C.pos,color:C.bg0}), onClick: save},
          feedback && feedback !== 'Reset' ? '\u2713 '+feedback : (existing ? 'Update' : 'Save')),
        existing && h('button', {style:Object.assign({},S.btn,{background:C.fail,borderColor:C.fail,color:'#fff'}), onClick: reset},
          feedback === 'Reset' ? '\u2713 Reset' : 'Reset')));
  };

  /* ── SUMMARY BAR with trace verdict ────────────────────────── */
  var annoCount = 0;
  var passCount = 0;
  var failCount = 0;
  regions.forEach(function(r) {
    if (r.value && r.value.turn_id && r.value.turn_id !== '__trace__') {
      annoCount++;
      if (r.value.verdict === 'pass') passCount++;
      if (r.value.verdict === 'fail') failCount++;
    }
  });
  var userCount = turns.filter(function(t){return t.role==='user';}).length;
  var asstCount = turns.filter(function(t){return t.role==='assistant';}).length;
  var toolCount = turns.filter(function(t){return t.role==='tool';}).length;

  /* ── RENDER ────────────────────────────────────────────────── */
  return h('div', {style: S.root},
    // Header
    h('div', {style: S.header},
      h('span', {style:{fontSize:'14px',fontWeight:600,color:C.txtSec}}, 'Trace Review'),
      source && h('span', {style:Object.assign({},S.badge,{fontSize:'10px'})}, source),
      h('span', {style:{marginLeft:'auto',fontSize:'11px',color:C.txtMut}}, 'Trace: '+trunc(traceId, 16))),

    // Main 3-panel layout
    h('div', {style: S.main},
      // Left: turns list
      h('div', {style: S.leftPanel},
        h('div', {style: S.panelHead},
          h('span', null, 'Turns'),
          h('span', {style:{fontFamily:'monospace'}}, turns.length)),
        h('div', {style: S.list}, renderTurnsList())),

      // Center: detail
      h('div', {style: S.centerPanel},
        h('div', {style: S.panelHead}, 'Turn Details'),
        h('div', {style: S.detail}, renderDetail())),

      // Right: annotation
      h('div', {style: S.rightPanel},
        h('div', {style: S.panelHead}, 'Annotation'),
        renderForm())),

    // Summary bar with trace-level verdict
    h('div', {style: S.summaryBar},
      h('span', {style:{color:C.txtMut}}, 'Turns: '),
      h('span', {style:{fontFamily:'monospace',fontWeight:600,marginRight:'12px'}}, userCount+'u / '+asstCount+'a / '+toolCount+'t'),
      h('span', {style:{color:C.txtMut,marginRight:'4px'}}, 'Reviewed: '),
      h('span', {style:{fontFamily:'monospace',fontWeight:600,marginRight:'4px'}}, annoCount+'/'+turns.length),
      passCount > 0 && h('span', {style:Object.assign({},S.badge,{background:'rgba(52,152,141,0.3)',color:C.pass,marginRight:'4px'})}, passCount+' pass'),
      failCount > 0 && h('span', {style:Object.assign({},S.badge,{background:'rgba(204,94,70,0.3)',color:C.fail,marginRight:'4px'})}, failCount+' fail'),
      h('span', {style:{marginLeft:'auto',display:'flex',gap:'6px',alignItems:'center'}}),
      h('span', {style:{color:C.txtMut,marginLeft:'auto'}}, 'Trace verdict: '),
      h('button', {
        style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='pass' ? C.pass : C.bg2, color: traceVerdict==='pass' ? C.bg0 : C.txtSec, borderColor: traceVerdict==='pass' ? C.pass : C.brd}),
        onClick: function(){ saveTraceVerdict('pass'); }
      }, 'Pass'),
      h('button', {
        style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='fail' ? C.fail : C.bg2, color: traceVerdict==='fail' ? '#fff' : C.txtSec, borderColor: traceVerdict==='fail' ? C.fail : C.brd}),
        onClick: function(){ saveTraceVerdict('fail'); }
      }, 'Fail'),
      h('button', {
        style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='partial' ? C.warn : C.bg2, color: traceVerdict==='partial' ? C.bg0 : C.txtSec, borderColor: traceVerdict==='partial' ? C.warn : C.brd}),
        onClick: function(){ saveTraceVerdict('partial'); }
      }, 'Partial')));
}

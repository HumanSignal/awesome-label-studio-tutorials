function TraceAnnotator({ React, addRegion, regions, data }) {
  var h = React.createElement;
  var useState = React.useState;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  /* ── Label Studio design system colours ──────────────────────── */
  var C = {
    bg0: '#12110d',     // sand/900
    bg1: '#1e1d1a',     // sand/850
    bg2: '#262522',     // sand/800
    bgHov: '#45433e',   // sand/700
    brd: '#45433e',     // sand/700

    txt: '#f9f8f6',     // sand/100
    txtSec: '#e1ded5',  // sand/300
    txtMut: '#a49f95',  // sand/500
    txtDark: '#12110d', // sand/900

    user: '#539eee',    // blueberry/400
    asst: '#ca8ad6',    // plum/400
    tool: '#d6964a',    // mango/400
    system: '#6d87f1',  // grape/400

    // Semantic — corrected to LS design token values
    pass: '#287a72',     // --color-positive-surface
    passTxt: '#57b7ab',  // --color-positive-content
    fail: '#cc5e46',     // --color-negative-surface
    failTxt: '#ff7557',  // --color-negative-content
    warn: '#cc854f',     // --color-warning-surface (Mixed verdict)
    warnTxt: '#ffa663',  // --color-warning-content

    sevCrit: '#cc5e46',  // --color-negative-surface
    sevMaj:  '#cc854f',  // --color-warning-surface
    sevMin:  '#539eee',  // blueberry/400 (informational)
    sevSug:  '#287a72',  // --color-positive-surface
  };

  /* ── platform accent colour ─────────────────────────────────── */
  var trace = (data && data.data) ? data.data : (data || {});
  var source = (trace.metadata && trace.metadata.source) || '';
  var accentMap = { langsmith: '#539eee', braintrust: '#d6964a', langfuse: '#ca8ad6' };
  var accent = accentMap[source.toLowerCase()] || '#6d87f1'; // grape/400 default

  /* ── failure taxonomy ───────────────────────────────────────── */
  var TAXONOMY = {
    accuracy: { label: 'Accuracy & Faithfulness', items: [
      { id: 'af_hallucination', label: 'Hallucination' },
      { id: 'af_factual_error', label: 'Factual error' },
      { id: 'af_unsupported_claim', label: 'Unsupported claim' },
      { id: 'af_contradicts_context', label: 'Contradicts context' },
    ]},
    tool_retrieval: { label: 'Tool & Retrieval', items: [
      { id: 'tr_wrong_tool', label: 'Wrong tool selected' },
      { id: 'tr_wrong_params', label: 'Wrong parameters' },
      { id: 'tr_should_use_tool', label: 'Should have used tool' },
      { id: 'tr_ignored_result', label: 'Ignored tool result' },
      { id: 'tr_missing_retrieval', label: 'Missing context retrieval' },
    ]},
    reasoning: { label: 'Reasoning & Planning', items: [
      { id: 'rp_flawed_logic', label: 'Flawed logic' },
      { id: 'rp_wrong_assumption', label: 'Wrong assumption' },
      { id: 'rp_missed_edge_case', label: 'Missed edge case' },
      { id: 'rp_unnecessary_step', label: 'Unnecessary step' },
      { id: 'rp_premature_conclusion', label: 'Premature conclusion' },
    ]},
    response: { label: 'Response Quality', items: [
      { id: 'rq_incomplete', label: 'Incomplete answer' },
      { id: 'rq_verbose', label: 'Too verbose' },
      { id: 'rq_off_topic', label: 'Off-topic' },
      { id: 'rq_poor_formatting', label: 'Poor formatting' },
      { id: 'rq_missing_caveats', label: 'Missing caveats/disclaimers' },
    ]},
    safety: { label: 'Safety & Compliance', items: [
      { id: 'sc_pii_exposure', label: 'PII exposure' },
      { id: 'sc_prompt_injection', label: 'Prompt injection susceptibility' },
      { id: 'sc_policy_violation', label: 'Policy violation' },
      { id: 'sc_unsafe_content', label: 'Unsafe/harmful content' },
      { id: 'sc_unauthorized_action', label: 'Unauthorized action' },
    ]},
  };

  var SEVERITIES = [
    { id: 'critical', label: 'Critical', color: C.sevCrit },
    { id: 'major',    label: 'Major',    color: C.sevMaj },
    { id: 'minor',    label: 'Minor',    color: C.sevMin },
    { id: 'suggestion', label: 'Suggestion', color: C.sevSug },
  ];

  /* ── data access ───────────────────────────────────────────── */
  var traceId = trace.trace_id || trace.session_id || 'unknown';
  var projectName = (trace.metadata && trace.metadata.name) || '';
  var turns = trace.turns || [];

  /* ── state ─────────────────────────────────────────────────── */
  var _selIdx = useState(null);       var selIdx = _selIdx[0];         var setSelIdx = _selIdx[1];
  var _expanded = useState({});       var expanded = _expanded[0];     var setExpanded = _expanded[1];
  var _verdict = useState(null);      var verdict = _verdict[0];       var setVerdict = _verdict[1];
  var _failures = useState([]);       var failures = _failures[0];     var setFailures = _failures[1];
  var _severity = useState(null);     var severity = _severity[0];     var setSeverity = _severity[1];
  var _expected = useState('');       var expected = _expected[0];     var setExpected = _expected[1];
  var _comments = useState('');       var comments = _comments[0];     var setComments = _comments[1];
  var _feedback = useState(null);     var feedback = _feedback[0];     var setFeedback = _feedback[1];
  var _traceVerdict = useState(null); var traceVerdict = _traceVerdict[0]; var setTraceVerdict = _traceVerdict[1];
  var _searchText = useState('');      var searchText = _searchText[0];     var setSearchText = _searchText[1];
  var _excludedRoles = useState({});   var excludedRoles = _excludedRoles[0]; var setExcludedRoles = _excludedRoles[1];
  var _idCopied = useState(false);     var idCopied = _idCopied[0];          var setIdCopied = _idCopied[1];
  var _mdPreview = useState(true);    var mdPreview = _mdPreview[0];        var setMdPreview = _mdPreview[1];
  var _markedLoaded = useState(false); var markedLoaded = _markedLoaded[0];  var setMarkedLoaded = _markedLoaded[1];
  var markedRef = useRef(null);

  /* ── annotation map: turn_id → region ──────────────────────── */
  var annoMap = useMemo(function() {
    var m = {};
    regions.forEach(function(r) {
      if (r.value && r.value.turn_id) m[r.value.turn_id] = r;
      if (r.value && r.value.turn_id === '__trace__') m['__trace__'] = r;
    });
    return m;
  }, [regions]);

  /* ── restore trace verdict from saved regions ──────────────── */
  useEffect(function() {
    var traceRegion = annoMap['__trace__'];
    if (traceRegion && traceRegion.value && traceRegion.value.verdict) {
      setTraceVerdict(traceRegion.value.verdict);
    }
  }, [annoMap]);

  /* ── load marked + inject markdown CSS on mount ─────────────── */
  useEffect(function() {
    if (!document.getElementById('ls-md-preview-styles')) {
      var style = document.createElement('style');
      style.id = 'ls-md-preview-styles';
      style.textContent = [
        '.md-preview p{margin:0 0 8px}',
        '.md-preview p:last-child{margin-bottom:0}',
        '.md-preview ul,.md-preview ol{margin:0 0 8px 20px;padding:0}',
        '.md-preview ul li{list-style:disc}',
        '.md-preview ol li{list-style:decimal}',
        '.md-preview li{margin-bottom:2px}',
        '.md-preview h1,.md-preview h2,.md-preview h3{font-weight:600;margin:0 0 6px}',
        '.md-preview code{background:rgba(0,0,0,0.35);padding:1px 5px;border-radius:3px;font-family:SF Mono,Consolas,monospace;font-size:11px}',
        '.md-preview pre{background:rgba(0,0,0,0.35);padding:8px;border-radius:4px;margin:0 0 6px;overflow-x:auto}',
        '.md-preview pre code{background:none;padding:0}',
        '.md-preview strong{font-weight:600}',
        '.md-preview em{font-style:italic}',
        '.md-preview a{color:#79c0ff}',
        '.md-preview blockquote{border-left:3px solid #45433e;padding-left:12px;margin:0 0 6px;color:#a49f95}',
      ].join('');
      document.head.appendChild(style);
    }
    import('https://cdn.jsdelivr.net/npm/marked/+esm').then(function(mod) {
      var lib = mod.marked || mod.default;
      // Wrap so we always pass {breaks:false, gfm:true} regardless of marked version
      markedRef.current = function(s) {
        var opts = {breaks: false, gfm: true};
        if (typeof lib.parse === 'function') return lib.parse(s, opts);
        return lib(s, opts);
      };
      setMarkedLoaded(true);
    });
  }, []);

  /* ── roles present in this trace (for filter pills) ─────────── */
  var presentRoles = useMemo(function() {
    var seen = {};
    turns.forEach(function(t) { if (t.role) seen[t.role] = true; });
    return ['user','assistant','tool','system'].filter(function(r){ return seen[r]; });
  }, [turns]);

  /* ── filtered turns (search + role multi-select) ──────────── */
  var filteredTurns = useMemo(function() {
    return turns.reduce(function(acc, t, i) {
      var matchRole = !excludedRoles[t.role];
      var q = searchText.toLowerCase();
      var matchText = !q
        || (t.content || '').toLowerCase().indexOf(q) >= 0
        || (t.tool_name || '').toLowerCase().indexOf(q) >= 0;
      if (matchRole && matchText) acc.push({ turn: t, idx: i });
      return acc;
    }, []);
  }, [turns, searchText, excludedRoles]);

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

  var copyTraceId = useCallback(function() {
    try { navigator.clipboard.writeText(traceId); } catch(e) {}
    setIdCopied(true);
    setTimeout(function() { setIdCopied(false); }, 1500);
  }, [traceId]);

  /* ── helpers ───────────────────────────────────────────────── */
  var trunc = function(s, n) { return !s ? '' : s.length <= n ? s : s.slice(0, n) + '...'; };
  var fmtNum = function(n) { return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n); };
  var fmtDuration = function(ms) { return ms == null ? null : ms >= 1000 ? (ms/1000).toFixed(1)+'s' : ms+'ms'; };
  var roleColor = function(r) { return r === 'user' ? C.user : r === 'tool' ? C.tool : r === 'system' ? C.system : C.asst; };
  var roleLabel = function(r) { return (r || 'assistant').toUpperCase(); };
  var sevColor = function(s) { var l = SEVERITIES.find(function(x){return x.id===s;}); return l ? l.color : C.txtMut; };

  /* ── hex to rgba helper ────────────────────────────────────── */
  var hexToRgba = function(hex, alpha) {
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+alpha+')';
  };

  /* ── json-aware content renderer ──────────────────────────── */
  var syntaxHighlight = function(json) {
    // Single-pass tokenizer: match strings-with-optional-colon, booleans, null, numbers, punctuation
    var TOKEN = /"(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:]/g;
    return json.replace(/[&<>]/g, function(c){ return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;'; })
      .replace(TOKEN, function(match) {
        var color;
        if (match === '{' || match === '}' || match === '[' || match === ']' || match === ':' || match === ',') {
          color = '#e6edf3'; // punctuation
        } else if (/^"/.test(match)) {
          color = match.slice(-1) === ':' ? '#79c0ff' : '#a5d6a7'; // key=blue, string=green
        } else if (match === 'true' || match === 'false') {
          color = '#c678dd'; // boolean — purple
        } else if (match === 'null') {
          color = '#7d8590'; // null — dim
        } else {
          color = '#f2cc60'; // number — warm yellow
        }
        return '<span style="color:'+color+'">'+match+'</span>';
      });
  };

  var pyToJson = function(s) {
    // Replace Python single-quoted strings with double-quoted JSON strings.
    // Only replace quotes that are string delimiters, not apostrophes inside words.
    var result = '';
    var i = 0;
    while (i < s.length) {
      if (s[i] === "'" ) {
        // Find matching closing single quote (skip escaped)
        var j = i + 1;
        while (j < s.length && !(s[j] === "'" && s[j-1] !== '\\')) j++;
        var inner = s.slice(i+1, j).replace(/"/g, '\\"').replace(/\\'/g, "'");
        result += '"' + inner + '"';
        i = j + 1;
      } else {
        result += s[i];
        i++;
      }
    }
    return result
      .replace(/\bTrue\b/g,'true')
      .replace(/\bFalse\b/g,'false')
      .replace(/\bNone\b/g,'null');
  };

  var renderContent = function(str) {
    if (!str) return h('span', null, '');
    var trimmed = str.trim();
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      var parsed = null;
      try { parsed = JSON.parse(trimmed); } catch(e) {
        try { parsed = JSON.parse(pyToJson(trimmed)); } catch(e2) {}
      }
      if (parsed !== null) {
        var pretty = JSON.stringify(parsed, null, 2);
        var html = syntaxHighlight(pretty);
        return h('span', {dangerouslySetInnerHTML: {__html: html}});
      }
    }
    return h('span', {style:{whiteSpace:'pre-wrap'}}, str);
  };

  /* ── styles ────────────────────────────────────────────────── */
  var S = {
    root: { fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', fontSize: '13px', lineHeight: 1.5, background: C.bg0, color: C.txt, height: 'calc(100vh - 120px)', minHeight: '600px', display: 'flex', flexDirection: 'column', borderRadius: '8px', overflow: 'hidden', border: '1px solid '+C.brd },
    header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: accent, borderBottom: '1px solid '+C.brd, flexShrink: 0 },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    leftPanel: { width: '300px', minWidth: '300px', display: 'flex', flexDirection: 'column', borderRight: '1px solid '+C.brd, background: C.bg0 },
    centerPanel: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: '400px', background: C.bg0 },
    rightPanel: { display: 'flex', flexDirection: 'column', background: C.bg1, width: '400px', minWidth: '400px', borderLeft: '1px solid '+C.brd },
    panelHead: { padding: '8px 12px', background: C.bg1, borderBottom: '1px solid '+C.brd, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: C.txtMut, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    list: { flex: 1, overflowY: 'auto', padding: '6px' },
    empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.txtMut, fontSize: '13px' },
    detail: { flex: 1, overflowY: 'auto', padding: '16px' },
    form: { flex: 1, overflowY: 'auto', padding: '12px' },
    code: { background: C.bg2, border: '1px solid '+C.brd, borderRadius: '4px', padding: '10px', fontFamily: 'SF Mono,Consolas,Monaco,monospace', fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '400px', overflowY: 'auto', marginTop: '6px' },
    badge: { fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 },
    btn: { padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid '+C.brd, borderRadius: '4px', background: C.bg2, color: C.txt, cursor: 'pointer' },
    textarea: { width: '100%', minHeight: '60px', padding: '8px', fontSize: '12px', fontFamily: 'SF Mono,Consolas,Monaco,monospace', background: C.bg0, border: '1px solid '+C.brd, borderRadius: '4px', color: C.txt, resize: 'vertical', boxSizing: 'border-box' },
    summaryBar: { display: 'flex', gap: '12px', padding: '8px 16px', borderTop: '1px solid '+C.brd, fontSize: '11px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' },
    label: { fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: C.txtMut, display: 'block', marginBottom: '6px' },
  };

  /* ── TURNS LIST (left panel) ───────────────────────────────── */
  var renderTurnsList = function() {
    if (!turns.length) return h('div', {style: S.empty}, 'No turns');
    if (!filteredTurns.length) return h('div', {style: S.empty}, 'No matching turns');
    return filteredTurns.map(function(item) {
      var turn = item.turn;
      var i = item.idx;
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

      var roleBadge = h('span', {style: Object.assign({}, S.badge, {background:rc, color:C.txtDark, textTransform:'uppercase', fontSize:'10px', fontWeight:600})}, roleLabel(turn.role));

      var badges = [];
      if (turn.role === 'tool' && turn.tool_name) {
        badges.push(h('span', {key:'tn', style: Object.assign({}, S.badge, {background:hexToRgba(C.tool,0.2),color:C.tool})}, turn.tool_name));
      }
      if (hasTools) {
        turn.tool_calls.forEach(function(tc, j) {
          badges.push(h('span', {key:'tc'+j, style: Object.assign({}, S.badge, {background:hexToRgba(C.tool,0.2),color:C.tool})}, tc.tool_name));
        });
      }
      if (turn.thinking) badges.push(h('span', {key:'th', style: Object.assign({}, S.badge, {background:hexToRgba(C.asst,0.2),color:C.asst})}, 'thinking'));
      if (turnVerdict === 'pass') badges.push(h('span', {key:'v', style: Object.assign({}, S.badge, {background:hexToRgba(C.pass,0.2),color:C.passTxt})}, 'pass'));
      else if (turnVerdict === 'fail') badges.push(h('span', {key:'v', style: Object.assign({}, S.badge, {background:hexToRgba(C.fail,0.2),color:C.failTxt})}, 'fail'));

      var preview = trunc((turn.content || '').replace(/\n/g, ' '), 55);
      var dur = fmtDuration(turn.duration_ms);

      return h('div', {key: turn.turn_id || i, style: turnStyle, onClick: function(){selectTurn(i);}},
        h('div', {style: {display:'flex',alignItems:'center',gap:'6px',padding:'6px 8px',minWidth:0}},
          roleBadge,
          h('div', {style: {display:'flex',gap:'4px',marginLeft:'auto',overflowX:'auto',alignItems:'center',flexShrink:1,minWidth:0,scrollbarWidth:'none'}},
            badges),
          dur && h('span', {style:{fontSize:'10px',color:C.txtMut,fontFamily:'monospace',flexShrink:0,paddingLeft:'4px'}}, dur)),
        h('div', {style: {padding:'0 8px 6px 8px',fontSize:'12px',color:C.txtSec,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}, preview));
    });
  };

  /* ── markdown helpers ──────────────────────────────────────── */
  var looksLikeMarkdown = function(s) {
    return /(?:^|\n)#{1,6} |\*\*.+?\*\*|(?:^|\n)[*\-] |`[^`]|\[.+?\]\(.+?\)/.test(s);
  };

  var toggleMdPreview = function() { setMdPreview(function(v) { return !v; }); };

  /* ── DETAIL (center panel) ─────────────────────────────────── */
  var renderDetail = function() {
    if (!selTurn) return h('div', {style: S.empty}, 'Select a turn to view details');
    var sections = [];

    var darkCode = Object.assign({}, S.code, {background: C.bg0});

    if (selTurn.role === 'tool') {
      // Tool turns: show call (input) THEN response (content) — dark code block, no tool-name header
      if (selTurn.tool_input) {
        sections.push(h('div', {key:'tool_call', style:{marginBottom:'16px'}},
          h('div', {style: S.label}, 'Tool Call'),
          h('div', {style: darkCode}, renderContent(selTurn.tool_input))));
      }
      if (selTurn.content) {
        sections.push(h('div', {key:'tool_response', style:{marginBottom:'16px'}},
          h('div', {style: S.label}, 'Tool Response'),
          h('div', {style: darkCode}, renderContent(selTurn.content))));
      }
    } else {
      // Non-tool turns: content first
      if (selTurn.content) {
        var hasMarkdown = looksLikeMarkdown(selTurn.content);
        sections.push(h('div', {key:'content', style:{marginBottom:'16px'}},
          h('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}},
            h('span', {style: Object.assign({}, S.label, {display:'inline', marginBottom:0})}, 'Content'),
            hasMarkdown && h('button', {
              onClick: toggleMdPreview,
              style: {fontSize:'10px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',
                      background:'transparent',border:'1px solid '+C.brd,borderRadius:'4px',
                      color: mdPreview ? C.asst : C.txtMut, padding:'2px 8px',cursor:'pointer'}
            }, mdPreview ? 'Raw' : 'Preview')),
          mdPreview && markedLoaded
            ? h('div', {
                className: 'md-preview',
                style: Object.assign({}, S.code, {fontFamily:'inherit', fontSize:'13px', lineHeight:1.6, whiteSpace:'normal'}),
                dangerouslySetInnerHTML: {__html: markedRef.current(selTurn.content)}
              })
            : h('div', {style: S.code}, renderContent(selTurn.content))));
      }
      // Tool calls on assistant turns — orange name header + dark code block
      if (selTurn.tool_calls && selTurn.tool_calls.length > 0) {
        sections.push(h('div', {key:'tools', style:{marginBottom:'16px'}},
          h('div', {style: S.label}, 'Tool Calls ('+selTurn.tool_calls.length+')'),
          selTurn.tool_calls.map(function(tc, i) {
            return h('div', {key:i, style:{marginBottom:'10px',border:'1px solid '+C.brd,borderRadius:'6px',overflow:'hidden'}},
              h('div', {style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',background:C.bg2,borderBottom:'1px solid '+C.brd}},
                h('span', {style:{fontWeight:600,color:C.tool,fontFamily:'SF Mono,Consolas,Monaco,monospace'}}, tc.tool_name)),
              h('div', {style:{padding:'8px 10px'}},
                h('div', {style: S.label}, 'Input'),
                h('div', {style: Object.assign({}, darkCode, {border:'none', marginTop:'4px'})},
                  renderContent(typeof tc.input === 'object' ? JSON.stringify(tc.input, null, 2) : String(tc.input || '')))));
          })));
      }
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

    // Model + duration (same row)
    if (selTurn.model || selTurn.duration_ms != null) {
      sections.push(h('div', {key:'model', style:{marginBottom:'16px',display:'flex',gap:'24px',flexWrap:'wrap'}},
        selTurn.model && h('div', null,
          h('div', {style: S.label}, 'Model'),
          h('div', {style:{fontSize:'12px',color:C.txtSec,fontFamily:'SF Mono,Consolas,Monaco,monospace'}}, selTurn.model)),
        selTurn.duration_ms != null && h('div', null,
          h('div', {style: S.label}, 'Duration'),
          h('div', {style:{fontSize:'12px',color:C.txtSec,fontFamily:'monospace'}}, fmtDuration(selTurn.duration_ms)))));
    }

    // Thinking (extended reasoning — collapsible)
    if (selTurn.thinking) {
      sections.push(h('div', {key:'thinking', style:{marginBottom:'16px'}},
        h('details', null,
          h('summary', {style:{fontSize:'11px',fontWeight:600,textTransform:'uppercase',color:C.asst,cursor:'pointer',userSelect:'none',letterSpacing:'0.5px'}}, 'Thinking'),
          h('div', {style:Object.assign({},S.code,{marginTop:'8px',borderLeft:'3px solid '+C.asst,borderRadius:'0 4px 4px 0'})},
            selTurn.thinking))));
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
            style: Object.assign({}, S.btn, {flex:1, background: verdict==='pass' ? C.pass : C.bg2, color: verdict==='pass' ? C.txt : C.txtSec, borderColor: verdict==='pass' ? C.pass : C.brd, fontWeight: 600}),
            onClick: function(){ setVerdict(verdict==='pass' ? null : 'pass'); }
          }, 'Pass'),
          h('button', {
            style: Object.assign({}, S.btn, {flex:1, background: verdict==='fail' ? C.fail : C.bg2, color: verdict==='fail' ? C.txt : C.txtSec, borderColor: verdict==='fail' ? C.fail : C.brd, fontWeight: 600}),
            onClick: function(){ setVerdict(verdict==='fail' ? null : 'fail'); }
          }, 'Fail'))),

      // ── Issue Tags (always visible) ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Issue Tags'),
        h('div', {style:{background:C.bg0,border:'1px solid '+C.brd,borderRadius:'4px',padding:'6px',maxHeight:'220px',overflowY:'auto'}},
          Object.keys(TAXONOMY).map(function(catId) {
            var cat = TAXONOMY[catId];
            var isExp = expanded[catId];
            var selCount = cat.items.filter(function(it){return failures.indexOf(it.id)>=0;}).length;
            return h('div', {key: catId, style:{marginBottom:'2px'}},
              h('div', {style:{display:'flex',alignItems:'center',gap:'6px',padding:'4px 6px',cursor:'pointer',borderRadius:'3px',fontSize:'12px',color:C.txtSec,background:isExp?C.bg2:'transparent'}, onClick:function(){toggleCat(catId);}},
                h('span', {style:{fontSize:'10px',width:'12px'}}, isExp ? '\u2212' : '+'),
                h('span', null, cat.label),
                selCount > 0 && h('span', {style:Object.assign({},S.badge,{marginLeft:'auto',background:hexToRgba(C.failTxt,0.2),color:C.failTxt})}, selCount)),
              isExp && h('div', {style:{paddingLeft:'18px'}},
                cat.items.map(function(item) {
                  var checked = failures.indexOf(item.id) >= 0;
                  return h('div', {key:item.id, style:{display:'flex',alignItems:'center',gap:'6px',padding:'3px 6px',cursor:'pointer',borderRadius:'3px',fontSize:'11px',color:C.txt,background:checked?C.bgHov:'transparent'}, onClick:function(){toggleFailure(item.id);}},
                    h('input', {type:'checkbox', checked:checked, onChange:function(){}, style:{width:'14px',height:'14px',cursor:'pointer'}}),
                    h('span', null, item.label));
                })));
          }))),

      // ── Severity ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Severity'),
        h('div', {style:{display:'flex',gap:'6px',flexWrap:'wrap'}},
          SEVERITIES.map(function(lv) {
            var sel = severity === lv.id;
            return h('button', {key:lv.id, style:Object.assign({}, S.btn, {background:sel?lv.color:C.bg2, color:sel?C.txt:C.txtSec, borderColor:sel?lv.color:C.brd, padding:'5px 10px', fontSize:'11px'}), onClick:function(){setSeverity(severity===lv.id?null:lv.id);}}, lv.label);
          }))),

      // ── Expected Behavior ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Expected Behavior'),
        h('textarea', {style: S.textarea, value: expected, onChange: function(e){setExpected(e.target.value);}, placeholder: 'What should the agent have done instead?'})),

      // ── Comments ──
      h('div', {style:{marginBottom:'14px'}},
        h('label', {style: S.label}, 'Comments'),
        h('textarea', {style: S.textarea, value: comments, onChange: function(e){setComments(e.target.value);}, placeholder: 'Additional notes...'})),

      // ── Actions ──
      h('div', {style:{display:'flex',gap:'6px'}},
        h('button', {style:Object.assign({},S.btn,{background:C.pass,borderColor:C.pass,color:C.txt}), onClick: save},
          feedback && feedback !== 'Reset' ? '\u2713 '+feedback : (existing ? 'Update' : 'Save')),
        existing && h('button', {style:Object.assign({},S.btn,{background:C.fail,borderColor:C.fail,color:C.txt}), onClick: reset},
          feedback === 'Reset' ? '\u2713 Reset' : 'Reset')));
  };

  /* ── SUMMARY BAR stats ─────────────────────────────────────── */
  var annoCount = 0;
  var passCount = 0;
  var failCount = 0;
  var tagTotal = 0;
  var sevCounts = {};
  regions.forEach(function(r) {
    if (r.value && r.value.turn_id && r.value.turn_id !== '__trace__') {
      annoCount++;
      if (r.value.verdict === 'pass') passCount++;
      if (r.value.verdict === 'fail') failCount++;
      tagTotal += (r.value.failure_modes || []).length;
      var sev = r.value.severity;
      if (sev) sevCounts[sev] = (sevCounts[sev] || 0) + 1;
    }
  });
  var userCount = turns.filter(function(t){return t.role==='user';}).length;
  var asstCount = turns.filter(function(t){return t.role==='assistant';}).length;
  var toolCount = turns.filter(function(t){return t.role==='tool';}).length;

  var traceIdDisplay = traceId.length > 16 ? traceId.slice(0,8)+'...'+traceId.slice(-4) : traceId;

  /* ── RENDER ────────────────────────────────────────────────── */
  return h('div', {style: S.root},
    // Header — accent background with project name and trace ID copy
    h('div', {style: S.header},
      h('span', {style:{fontSize:'14px',fontWeight:600,color:C.txtDark}}, 'Trace Review'),
      projectName && h('span', {style:Object.assign({},S.badge,{background:'rgba(18,17,13,0.2)',color:C.txtDark})}, projectName),
      source && h('span', {style:Object.assign({},S.badge,{background:'rgba(18,17,13,0.15)',color:C.txtDark})}, source),
      h('div', {style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:'6px'}},
        h('span', {style:{fontSize:'11px',color:C.txtDark,opacity:0.7}}, 'Trace: '+traceIdDisplay),
        h('button', {
          style:{fontSize:'11px',padding:'2px 6px',background:'rgba(18,17,13,0.2)',border:'none',borderRadius:'3px',cursor:'pointer',color:C.txtDark,fontWeight:500},
          onClick: copyTraceId
        }, idCopied ? '\u2713' : 'copy'))),

    // Main 3-panel layout
    h('div', {style: S.main},
      // Left: turns list with search + filter toolbar
      h('div', {style: S.leftPanel},
        h('div', {style: S.panelHead},
          h('span', null, 'Turns'),
          h('span', {style:{fontFamily:'monospace'}},
            filteredTurns.length < turns.length
              ? filteredTurns.length + '\u2009/\u2009' + turns.length
              : String(turns.length))),
        // Search + role filter toolbar
        h('div', {style:{padding:'8px 6px',borderBottom:'1px solid '+C.brd,flexShrink:0}},
          h('input', {
            type: 'text',
            placeholder: 'Search turns...',
            value: searchText,
            onChange: function(e){ setSearchText(e.target.value); },
            style:{width:'100%',padding:'5px 8px',fontSize:'12px',background:C.bg2,border:'1px solid '+C.brd,borderRadius:'4px',color:C.txt,boxSizing:'border-box',outline:'none',marginBottom:'6px'}
          }),
          h('div', {style:{display:'flex',gap:'3px',flexWrap:'wrap'}},
            presentRoles.map(function(role) {
              var isActive = !excludedRoles[role];
              var rc = roleColor(role);
              return h('button', {
                key: role,
                style:{
                  padding:'2px 7px', fontSize:'10px', fontWeight:500,
                  border:'1px solid '+(isActive ? rc : C.brd),
                  borderRadius:'3px',
                  background: isActive ? hexToRgba(rc, 0.2) : C.bg2,
                  color: isActive ? rc : C.txtMut,
                  cursor:'pointer', textTransform:'capitalize'
                },
                onClick: function(){
                  setExcludedRoles(function(p) {
                    var n = Object.assign({}, p);
                    if (n[role]) delete n[role]; else n[role] = true;
                    return n;
                  });
                }
              }, role.charAt(0).toUpperCase()+role.slice(1));
            }))),
        h('div', {style: S.list}, renderTurnsList())),

      // Center: detail
      h('div', {style: S.centerPanel},
        h('div', {style: S.panelHead}, 'Turn Details'),
        h('div', {style: S.detail}, renderDetail())),

      // Right: annotation
      h('div', {style: S.rightPanel},
        h('div', {style: S.panelHead}, 'Annotation'),
        renderForm())),

    // Summary bar — subtle accent background, labeled sections
    h('div', {style: Object.assign({}, S.summaryBar, {background: hexToRgba(accent, 0.12)})},
      // 1. Turns summary
      h('span', {style:{color:C.txtMut,flexShrink:0}}, 'Turns:'),
      h('span', {style:{fontFamily:'monospace',fontWeight:600,flexShrink:0}},
        userCount+'u\u2009/\u2009'+asstCount+'a\u2009/\u2009'+toolCount+'t'),

      // separator
      h('span', {style:{color:C.brd,flexShrink:0}}, '|'),

      // 2. Issue tags
      h('span', {style:{color:C.txtMut,flexShrink:0}}, 'Issue tags:'),
      h('span', {style:Object.assign({},S.badge,{background:C.bg2,color:C.txtSec,border:'1px solid '+C.brd})}, String(tagTotal)),

      // separator
      h('span', {style:{color:C.brd,flexShrink:0}}, '|'),

      // 3. Severity breakdown
      h('span', {style:{color:C.txtMut,flexShrink:0}}, 'Severity:'),
      ['critical','major','minor','suggestion'].map(function(sev) {
        var count = sevCounts[sev] || 0;
        if (!count) return null;
        return h('span', {key:sev, style:Object.assign({},S.badge,{background:hexToRgba(sevColor(sev),0.2),color:sevColor(sev)})},
          count+' '+sev.charAt(0).toUpperCase()+sev.slice(1));
      }),
      (!sevCounts.critical && !sevCounts.major && !sevCounts.minor && !sevCounts.suggestion) &&
        h('span', {style:{color:C.txtMut,fontSize:'11px'}}, '—'),

      // separator
      h('span', {style:{color:C.brd,flexShrink:0}}, '|'),

      // 4. Turn verdict badges
      h('span', {style:{color:C.txtMut,flexShrink:0}}, 'Turns verdict:'),
      passCount > 0 && h('span', {style:Object.assign({},S.badge,{background:hexToRgba(C.pass,0.25),color:C.passTxt})}, passCount+' pass'),
      failCount > 0 && h('span', {style:Object.assign({},S.badge,{background:hexToRgba(C.fail,0.25),color:C.failTxt})}, failCount+' fail'),
      (!passCount && !failCount) && h('span', {style:{color:C.txtMut,fontSize:'11px'}}, '—'),

      // 5. Trace verdict — pushed to right edge
      h('div', {style:{marginLeft:'auto',display:'flex',alignItems:'center',gap:'6px',flexShrink:0}},
        h('span', {style:{color:C.txtMut}}, 'Trace verdict:'),
        h('button', {
          style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='pass' ? C.pass : C.bg2, color: traceVerdict==='pass' ? C.txt : C.txtSec, borderColor: traceVerdict==='pass' ? C.pass : C.brd}),
          onClick: function(){ saveTraceVerdict('pass'); }
        }, 'Pass'),
        h('button', {
          style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='fail' ? C.fail : C.bg2, color: traceVerdict==='fail' ? C.txt : C.txtSec, borderColor: traceVerdict==='fail' ? C.fail : C.brd}),
          onClick: function(){ saveTraceVerdict('fail'); }
        }, 'Fail'),
        h('button', {
          style: Object.assign({}, S.btn, {padding:'3px 10px',fontSize:'11px', background: traceVerdict==='mixed' ? C.warn : C.bg2, color: traceVerdict==='mixed' ? C.txt : C.txtSec, borderColor: traceVerdict==='mixed' ? C.warn : C.brd}),
          onClick: function(){ saveTraceVerdict('mixed'); }
        }, 'Mixed'))));
}

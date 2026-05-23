(function() {
  var API_URL = 'https://ccg-chatbot.netlify.app/.netlify/functions/send-lead';
  var AUTO_OPEN_DELAY = 15000;
  var DISMISS_HOURS = 24;

  var dismissed = localStorage.getItem('ccg-dismissed');
  var submitted = localStorage.getItem('ccg-submitted');
  if (submitted) return;
  if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_HOURS * 3600000) return;

  var answers = {};
  var isOpen = false;
  var started = false;

  var style = document.createElement('style');
  style.textContent = `
    #ccg-cb-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#1a3a5c;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:999998;display:flex;align-items:center;justify-content:center;transition:transform .2s}
    #ccg-cb-btn:hover{transform:scale(1.1)}
    #ccg-cb-btn svg{width:28px;height:28px;fill:#fff}
    #ccg-cb-win{position:fixed;bottom:90px;right:20px;width:380px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:999999;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #ccg-cb-win.open{display:flex;animation:ccgIn .3s ease}
    @keyframes ccgIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .ccg-hd{background:#1a3a5c;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
    .ccg-hd-t{font-size:15px;font-weight:700}
    .ccg-hd-s{font-size:11px;opacity:0.7;margin-top:2px}
    .ccg-x{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;opacity:0.7;padding:0 4px}
    .ccg-x:hover{opacity:1}
    .ccg-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
    .ccg-m{max-width:85%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.5;animation:ccgFade .3s ease}
    @keyframes ccgFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .ccg-m.b{background:#f0f2f5;color:#111;border-bottom-left-radius:4px;align-self:flex-start}
    .ccg-m.u{background:#1a3a5c;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
    .ccg-bs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .ccg-b{background:#fff;border:2px solid #1a3a5c;color:#1a3a5c;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
    .ccg-b:hover{background:#1a3a5c;color:#fff}
    .ccg-b.p{background:#1a3a5c;color:#fff}
    .ccg-b.p:hover{background:#0d2640}
    .ccg-ir{padding:12px 16px;border-top:1px solid #eee;display:none}
    .ccg-ir input{width:100%;padding:10px 14px;border:2px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;outline:none}
    .ccg-ir input:focus{border-color:#1a3a5c}
    .ccg-ir button{width:100%;margin-top:8px;padding:12px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .ccg-tp{display:flex;gap:4px;padding:12px 16px;align-self:flex-start}
    .ccg-tp span{width:8px;height:8px;background:#ccc;border-radius:50%;animation:ccgBnc .6s infinite alternate}
    .ccg-tp span:nth-child(2){animation-delay:.2s}
    .ccg-tp span:nth-child(3){animation-delay:.4s}
    @keyframes ccgBnc{to{transform:translateY(-6px);background:#999}}
    .ccg-fm{display:flex;flex-direction:column;gap:8px;margin-top:8px}
    .ccg-fm input,.ccg-fm select{padding:10px 12px;border:2px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;outline:none}
    .ccg-fm input:focus,.ccg-fm select:focus{border-color:#1a3a5c}
    .ccg-fm button{padding:12px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px}
    @media(max-width:480px){#ccg-cb-win{bottom:0;right:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}#ccg-cb-btn{bottom:16px;right:16px}}
  `;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'ccg-cb-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  btn.onclick = function() { isOpen = !isOpen; if (isOpen) { win.classList.add('open'); if (!started) { started = true; step1(); } } else { win.classList.remove('open'); } };
  document.body.appendChild(btn);

  var win = document.createElement('div');
  win.id = 'ccg-cb-win';
  win.innerHTML = '<div class="ccg-hd"><div><div class="ccg-hd-t">Complete Contractor Group</div><div class="ccg-hd-s">Commercial Roofing Experts</div></div><button class="ccg-x" onclick="document.getElementById(\'ccg-cb-win\').classList.remove(\'open\')">&times;</button></div><div class="ccg-msgs" id="ccg-msgs"></div><div class="ccg-ir" id="ccg-ir"></div>';
  document.body.appendChild(win);

  var msgs;
  function M() { return document.getElementById('ccg-msgs'); }

  function addBot(text, delay) {
    delay = delay || 800;
    var m = M(); var t = document.createElement('div'); t.className = 'ccg-tp'; t.id = 'ccg-tp'; t.innerHTML = '<span></span><span></span><span></span>'; m.appendChild(t); m.scrollTop = m.scrollHeight;
    return new Promise(function(resolve) {
      setTimeout(function() { var tp = document.getElementById('ccg-tp'); if (tp) tp.remove(); var d = document.createElement('div'); d.className = 'ccg-m b'; d.innerHTML = text; M().appendChild(d); M().scrollTop = M().scrollHeight; resolve(); }, delay);
    });
  }

  function addUser(text) { var d = document.createElement('div'); d.className = 'ccg-m u'; d.textContent = text; M().appendChild(d); M().scrollTop = M().scrollHeight; }

  function showBtns(opts, cb) {
    var w = document.createElement('div'); w.className = 'ccg-bs'; w.style.animation = 'ccgFade .3s ease';
    opts.forEach(function(o) { var b = document.createElement('button'); b.className = 'ccg-b' + (o.p ? ' p' : ''); b.textContent = o.t; b.onclick = function() { w.remove(); addUser(o.t); cb(o.v || o.t); }; w.appendChild(b); });
    M().appendChild(w); M().scrollTop = M().scrollHeight;
  }

  function showInput(ph, cb) {
    var r = document.getElementById('ccg-ir'); r.style.display = 'block';
    r.innerHTML = '<input type="text" placeholder="' + ph + '" id="ccg-ti"><button onclick="window._ccgSend()">Send</button>';
    document.getElementById('ccg-ti').focus();
    document.getElementById('ccg-ti').onkeydown = function(e) { if (e.key === 'Enter') window._ccgSend(); };
    window._ccgSend = function() { var v = document.getElementById('ccg-ti').value.trim(); if (!v) return; r.style.display = 'none'; addUser(v); cb(v); };
  }

  function showForm() {
    var f = document.createElement('div'); f.className = 'ccg-fm';
    f.innerHTML = '<input type="text" id="ccg-fn" placeholder="Your name" required><input type="tel" id="ccg-fp" placeholder="Phone number" required><input type="email" id="ccg-fe" placeholder="Email" required><input type="text" id="ccg-fa" placeholder="Building address" required><select id="ccg-ft"><option value="">Best time to call...</option><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Anytime</option></select><button onclick="window._ccgSubmit()">Submit</button>';
    M().appendChild(f); M().scrollTop = M().scrollHeight;

    window._ccgSubmit = function() {
      var n = document.getElementById('ccg-fn').value.trim();
      var p = document.getElementById('ccg-fp').value.trim();
      var e = document.getElementById('ccg-fe').value.trim();
      var a = document.getElementById('ccg-fa').value.trim();
      var t = document.getElementById('ccg-ft').value;
      if (!n || !p || !e || !a) { alert('Please fill in all fields.'); return; }
      f.innerHTML = '<div style="text-align:center;padding:16px;color:#888">Sending...</div>';
      fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name:n, phone:p, email:e, address:a, bestTime:t, buildingType:answers.buildingType, roofAge:answers.roofAge, maintenance:answers.maintenance, painPoint:answers.painPoint, buildingSize:answers.buildingSize }) })
      .then(function() { f.remove(); addBot("You're all set! ✅ Teddy will reach out within 24 hours to schedule your free drone inspection. Thanks for protecting your investment!", 500); localStorage.setItem('ccg-submitted', '1'); })
      .catch(function() { f.remove(); addBot("Thanks! We got your info. Teddy will be in touch within 24 hours. ✅", 500); localStorage.setItem('ccg-submitted', '1'); });
    };
  }

  // CHAT FLOW
  function step1() {
    addBot("Hey there! 👋 Is your commercial building's roof protected? Most owners don't know their roof has problems until it's an emergency. I can help you find out in 60 seconds.").then(function() {
      showBtns([{ t: 'Check My Roof', p: true }, { t: 'No thanks' }], function(v) {
        if (v === 'No thanks') { localStorage.setItem('ccg-dismissed', Date.now()); win.classList.remove('open'); return; }
        step2();
      });
    });
  }

  function step2() {
    addBot("What type of building do you manage?").then(function() {
      showBtns([
        {t:'Apartment Complex'},{t:'Church / Worship'},{t:'School / Educational'},{t:'Retail / Shopping Center'},
        {t:'Office Building'},{t:'Industrial / Warehouse'},{t:'Municipal / Government'},{t:'Other'}
      ], function(v) { answers.buildingType = v; step3(); });
    });
  }

  function step3() {
    addBot("Roughly how old is your current roof?").then(function() {
      showBtns([{t:'Less than 5 years'},{t:'5-10 years'},{t:'10-20 years'},{t:'Over 20 years'},{t:'Not sure'}], function(v) { answers.roofAge = v; step4(); });
    });
  }

  function step4() {
    addBot("Do you currently have a preventative maintenance plan?").then(function() {
      showBtns([{t:'Yes, with another company'},{t:'No, never had one'},{t:'Had one but let it lapse'},{t:'Not sure what that is'}], function(v) { answers.maintenance = v; step5(); });
    });
  }

  function step5() {
    addBot("What's your biggest concern with your building right now?").then(function() {
      showBtns([
        {t:'Leaks or water intrusion'},{t:'Debris/ponding on the roof'},{t:'Insurance/storm damage'},
        {t:'Budget planning for repairs'},{t:"Don't know — haven't looked"},{t:'Just want a routine checkup'}
      ], function(v) { answers.painPoint = v; step6(); });
    });
  }

  function step6() {
    addBot("Approximately how large is the building? (square footage)").then(function() {
      showInput('e.g. 25,000 sq ft', function(v) { answers.buildingSize = v; step7(); });
    });
  }

  function step7() {
    var msg = getDynamicResponse();
    addBot(msg).then(function() {
      return addBot("Can we schedule a free drone roof inspection?", 600);
    }).then(function() {
      showBtns([{t:'Yes, schedule a free inspection', p:true},{t:'Tell me more about the program'}], function(v) {
        if (v === 'Tell me more about the program') stepTellMore1(); else stepCapture();
      });
    });
  }

  function getDynamicResponse() {
    var age = answers.roofAge, maint = answers.maintenance, pain = answers.painPoint;

    if (pain === 'Leaks or water intrusion') return "Leaks are usually a symptom of a bigger issue — failed seams, clogged drains, or deteriorating seals around HVAC units. Our thermal imaging inspection can pinpoint exactly where moisture is getting in, even if it's not visible yet. Let's get a drone up there and find the source.";
    if (pain === 'Insurance/storm damage') return "We manage insurance claims from start to finish — inspections, documentation, photos, estimates, and working directly with your adjuster. After a storm, we provide the evidence you need to maximize your claim. Let's do a free post-storm inspection.";
    if (pain === 'Budget planning for repairs') return "Our Annual Budget Forecast service gives you a clear picture of what your roof needs now, what it'll need in 1-3 years, and what it'll cost — so you can plan capital expenses instead of getting surprised. Starts with a free inspection.";
    if ((age === '10-20 years' || age === 'Over 20 years') && (maint === 'No, never had one' || maint === 'Had one but let it lapse')) return "A roof over 10 years old without regular maintenance is a ticking time bomb. Here's what we typically find on neglected commercial roofs: ponding water, debris damaging the membrane, clogged drains, failing seals around HVAC units, and exposed wiring — all invisible from the ground. Our maintenance program catches these with drone + thermal inspections before they become $50K emergencies.";
    if (maint === 'Yes, with another company') return "Smart move having a plan! Many building managers switch to us because we include drone analysis, thermal imaging for hidden leaks, and detailed photo documentation — not just a quick visual walkover. We also provide a Certificate of Roof Health and insurance-ready reports. Want to see how we compare?";
    if (age === 'Less than 5 years') return "Great — a newer roof is the perfect time to start maintenance. We'll establish a baseline condition report with drone and thermal imaging so you can track your roof's health over time. This keeps your warranty intact and catches issues before they void coverage.";
    if (maint === 'Not sure what that is') return "Think of it like preventative maintenance for your car — but for your building. We inspect your roof regularly with drones and thermal cameras, clean debris, check drains, seal penetrations, and catch small $500 problems before they become $50,000 emergencies. We also handle all documentation for insurance and compliance.";
    return "Based on what you've told me, a preventative maintenance program could save you thousands in emergency repairs. Our program includes semi-annual inspections with drone + thermal analysis and detailed digital reports.";
  }

  function stepTellMore1() {
    addBot("Our Roofing & Exterior Maintenance Program is fully customizable. You pick the services and frequency that fit your property. Here's what we offer:").then(function() {
      return addBot("<strong>Inspection Services:</strong><br>✅ Drone Roof Inspection<br>✅ Manual Roof Inspection (on-roof technician)<br>✅ Gutter System Inspection<br>✅ Siding/Exterior Walls Inspection<br>✅ Attic/Moisture Intrusion Inspection<br>✅ Thermal Imaging (finds hidden leaks & insulation issues)<br>✅ Post-Storm Inspection (on-call after major weather events)", 1000);
    }).then(function() {
      showBtns([{t:'What else?', p:true}], function() { stepTellMore2(); });
    });
  }

  function stepTellMore2() {
    addBot("<strong>Cleaning & Maintenance:</strong><br>✅ Roof Cleaning (moss, algae, debris removal)<br>✅ Gutter Cleaning & Downspout Flush<br>✅ Debris Removal from Flat Areas<br>✅ Minor Roof Repairs (shingle/tile, caulking)<br>✅ Sealing Roof Penetrations (vents, pipes, chimneys)<br>✅ Flashing Inspection & Sealing<br>✅ HVAC Roof Curb Seal Check<br>✅ Roof Coating / Waterproofing Touch-ups").then(function() {
      showBtns([{t:'What about documentation?', p:true}], function() { stepTellMore3(); });
    });
  }

  function stepTellMore3() {
    addBot("<strong>Documentation & Compliance:</strong><br>✅ Detailed Inspection Reports with Photos<br>✅ Roof Condition Photo Archives<br>✅ Repair Recommendation Reports with Estimates<br>✅ Maintenance Logs & Service History<br>✅ Certificate of Roof Health<br>✅ Insurance Claim Assistance<br>✅ Annual Budget Forecast for Roofing Maintenance<br>✅ Vendor Compliance Paperwork (W9, COI)").then(function() {
      return addBot("Every property is different — that's why our program is a checklist, not a package. You pick what you need, choose your frequency, and we handle the rest.", 800);
    }).then(function() {
      return addBot("Here's what we found on a recent commercial inspection that the building owner had <strong>NO IDEA</strong> about:", 800);
    }).then(function() {
      return addBot("🔴 Loose screws and razor blades on the TPO membrane<br>🔴 Broken HVAC condensate lines draining directly onto the roof<br>🔴 Heavy ponding water across multiple areas<br>🔴 Clogged roof drains with severe dirt/mud buildup<br>🔴 Exposed electrical wiring and unsecured conduit<br>🔴 Dried-out seam seals starting to peel<br>🔴 A dead rat on top of an electrical box", 1000);
    }).then(function() {
      return addBot("All of this was invisible from the ground. A $2,000 maintenance visit would have caught every one of these before they caused real damage.", 800);
    }).then(function() {
      showBtns([{t:"What's on MY roof? Schedule free inspection", p:true}], function() { stepCapture(); });
    });
  }

  function stepCapture() {
    addBot("Awesome! Let me connect you with Teddy to schedule your free drone roof inspection.").then(function() { showForm(); });
  }

  // Auto-open
  setTimeout(function() { if (!isOpen && !submitted) { isOpen = true; win.classList.add('open'); if (!started) { started = true; step1(); } } }, AUTO_OPEN_DELAY);
})();

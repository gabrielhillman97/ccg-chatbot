(function() {
  // Config
  var API_URL = 'https://ccg-chatbot.netlify.app/.netlify/functions/send-lead';
  var AUTO_OPEN_DELAY = 15000;
  var DISMISS_HOURS = 24;

  // Check if already dismissed or submitted
  var dismissed = localStorage.getItem('ccg-dismissed');
  var submitted = localStorage.getItem('ccg-submitted');
  if (submitted) return;
  if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_HOURS * 3600000) return;

  // State
  var answers = {};
  var isOpen = false;
  var currentStep = 0;

  // Inject styles
  var style = document.createElement('style');
  style.textContent = `
    #ccg-chatbot-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#1a3a5c;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:999998;display:flex;align-items:center;justify-content:center;transition:transform .2s}
    #ccg-chatbot-btn:hover{transform:scale(1.1)}
    #ccg-chatbot-btn svg{width:28px;height:28px;fill:#fff}
    #ccg-chatbot-window{position:fixed;bottom:90px;right:20px;width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.25);z-index:999999;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #ccg-chatbot-window.open{display:flex;animation:ccg-slide-in .3s ease}
    @keyframes ccg-slide-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    .ccg-header{background:#1a3a5c;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
    .ccg-header-title{font-size:15px;font-weight:700}
    .ccg-header-sub{font-size:11px;opacity:0.7;margin-top:2px}
    .ccg-close{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;opacity:0.7;padding:0 4px}
    .ccg-close:hover{opacity:1}
    .ccg-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
    .ccg-msg{max-width:85%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.5;animation:ccg-fade-in .3s ease}
    @keyframes ccg-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .ccg-msg.bot{background:#f0f2f5;color:#111;border-bottom-left-radius:4px;align-self:flex-start}
    .ccg-msg.user{background:#1a3a5c;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}
    .ccg-buttons{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .ccg-btn{background:#fff;border:2px solid #1a3a5c;color:#1a3a5c;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
    .ccg-btn:hover{background:#1a3a5c;color:#fff}
    .ccg-btn.primary{background:#1a3a5c;color:#fff}
    .ccg-btn.primary:hover{background:#0d2640}
    .ccg-input-row{padding:12px 16px;border-top:1px solid #eee;display:none}
    .ccg-input-row input,.ccg-input-row select{width:100%;padding:10px 14px;border:2px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;outline:none}
    .ccg-input-row input:focus{border-color:#1a3a5c}
    .ccg-input-row button{width:100%;margin-top:8px;padding:12px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .ccg-input-row button:hover{background:#0d2640}
    .ccg-typing{display:flex;gap:4px;padding:12px 16px;align-self:flex-start}
    .ccg-typing span{width:8px;height:8px;background:#ccc;border-radius:50%;animation:ccg-bounce .6s infinite alternate}
    .ccg-typing span:nth-child(2){animation-delay:.2s}
    .ccg-typing span:nth-child(3){animation-delay:.4s}
    @keyframes ccg-bounce{to{transform:translateY(-6px);background:#999}}
    .ccg-form{display:flex;flex-direction:column;gap:8px;margin-top:8px}
    .ccg-form input,.ccg-form select{padding:10px 12px;border:2px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;outline:none}
    .ccg-form input:focus,.ccg-form select:focus{border-color:#1a3a5c}
    .ccg-form button{padding:12px;background:#1a3a5c;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px}
    .ccg-form button:hover{background:#0d2640}
    @media(max-width:480px){#ccg-chatbot-window{bottom:0;right:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}#ccg-chatbot-btn{bottom:16px;right:16px}}
  `;
  document.head.appendChild(style);

  // Create button
  var btn = document.createElement('button');
  btn.id = 'ccg-chatbot-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  btn.onclick = function() { toggleChat(); };
  document.body.appendChild(btn);

  // Create window
  var win = document.createElement('div');
  win.id = 'ccg-chatbot-window';
  win.innerHTML = `
    <div class="ccg-header">
      <div><div class="ccg-header-title">Complete Contractor Group</div><div class="ccg-header-sub">Commercial Roofing Experts</div></div>
      <button class="ccg-close" onclick="document.getElementById('ccg-chatbot-window').classList.remove('open')">&times;</button>
    </div>
    <div class="ccg-messages" id="ccg-messages"></div>
    <div class="ccg-input-row" id="ccg-input-row"></div>
  `;
  document.body.appendChild(win);

  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      win.classList.add('open');
      if (currentStep === 0) startChat();
    } else {
      win.classList.remove('open');
    }
  }

  function addMsg(text, isUser) {
    var msgs = document.getElementById('ccg-messages');
    var div = document.createElement('div');
    div.className = 'ccg-msg ' + (isUser ? 'user' : 'bot');
    div.innerHTML = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    var msgs = document.getElementById('ccg-messages');
    var t = document.createElement('div');
    t.className = 'ccg-typing';
    t.id = 'ccg-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(t);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById('ccg-typing');
    if (t) t.remove();
  }

  function botMsg(text, delay) {
    delay = delay || 800;
    showTyping();
    setTimeout(function() {
      hideTyping();
      addMsg(text);
    }, delay);
    return delay;
  }

  function showButtons(options, callback) {
    var msgs = document.getElementById('ccg-messages');
    var wrap = document.createElement('div');
    wrap.className = 'ccg-buttons';
    wrap.style.animation = 'ccg-fade-in .3s ease';
    options.forEach(function(opt) {
      var b = document.createElement('button');
      b.className = 'ccg-btn' + (opt.primary ? ' primary' : '');
      b.textContent = opt.text;
      b.onclick = function() {
        wrap.remove();
        addMsg(opt.text, true);
        callback(opt.value || opt.text);
      };
      wrap.appendChild(b);
    });
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTextInput(placeholder, callback) {
    var row = document.getElementById('ccg-input-row');
    row.style.display = 'block';
    row.innerHTML = '<input type="text" placeholder="' + placeholder + '" id="ccg-text-input"><button onclick="ccgSubmitText()">Send</button>';
    document.getElementById('ccg-text-input').focus();
    document.getElementById('ccg-text-input').onkeydown = function(e) { if (e.key === 'Enter') ccgSubmitText(); };
    window.ccgSubmitText = function() {
      var val = document.getElementById('ccg-text-input').value.trim();
      if (!val) return;
      row.style.display = 'none';
      addMsg(val, true);
      callback(val);
    };
  }

  function showLeadForm() {
    var msgs = document.getElementById('ccg-messages');
    var form = document.createElement('div');
    form.className = 'ccg-form';
    form.innerHTML = `
      <input type="text" id="ccg-name" placeholder="Your name" required>
      <input type="tel" id="ccg-phone" placeholder="Phone number" required>
      <input type="email" id="ccg-email" placeholder="Email" required>
      <input type="text" id="ccg-address" placeholder="Building address" required>
      <select id="ccg-time">
        <option value="">Best time to call...</option>
        <option>Morning</option>
        <option>Afternoon</option>
        <option>Evening</option>
        <option>Anytime</option>
      </select>
      <button onclick="ccgSubmitLead()">Submit</button>
    `;
    msgs.appendChild(form);
    msgs.scrollTop = msgs.scrollHeight;

    window.ccgSubmitLead = function() {
      var name = document.getElementById('ccg-name').value.trim();
      var phone = document.getElementById('ccg-phone').value.trim();
      var email = document.getElementById('ccg-email').value.trim();
      var address = document.getElementById('ccg-address').value.trim();
      var bestTime = document.getElementById('ccg-time').value;
      if (!name || !phone || !email || !address) { alert('Please fill in all fields.'); return; }

      form.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Sending...</div>';

      var payload = {
        name: name, phone: phone, email: email, address: address, bestTime: bestTime,
        buildingType: answers.buildingType, roofAge: answers.roofAge,
        maintenance: answers.maintenance, buildingSize: answers.buildingSize
      };

      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function() {
        form.remove();
        botMsg("You're all set! ✅ Teddy will reach out within 24 hours to schedule your free drone inspection. Thanks for protecting your investment!", 500);
        localStorage.setItem('ccg-submitted', '1');
      }).catch(function() {
        form.remove();
        botMsg("Thanks! We got your info. Teddy will be in touch within 24 hours. ✅", 500);
        localStorage.setItem('ccg-submitted', '1');
      });
    };
  }

  function getDynamicResponse() {
    var age = answers.roofAge;
    var maint = answers.maintenance;

    if ((age === '10-20 years' || age === 'Over 20 years') && (maint === 'No, never had one' || maint === 'Had one but let it lapse')) {
      return "A roof over 10 years old without regular maintenance is at serious risk. Most commercial roof failures happen because small problems go undetected. Our preventative maintenance program includes semi-annual inspections with drone analysis and detailed digital reports. Clients typically save 40-60% versus emergency repairs.";
    }
    if (maint === 'Yes, with another company') {
      return "Smart move having a plan! Many building managers switch to us because we include drone analysis and digital reports — not just a quick visual walkover. Want to see how we compare?";
    }
    if (age === 'Less than 5 years') {
      return "Great — a newer roof is the perfect time to start maintenance. Catching issues early means your warranty stays intact and your roof reaches its full lifespan.";
    }
    if (maint === 'Not sure what that is') {
      return "A preventative maintenance plan means we inspect your roof twice a year, catch small problems before they become expensive emergencies, and keep your roof lasting its full lifespan. It's like an oil change for your building.";
    }
    return "Based on what you've told me, a preventative maintenance program could save you thousands in emergency repairs. Our program includes semi-annual inspections with drone analysis and detailed digital reports.";
  }

  function startChat() {
    currentStep = 1;
    var d = botMsg("Hey there! 👋 Is your commercial building's roof protected? Most owners don't know their roof has problems until it's an emergency. I can help you find out in 60 seconds.");
    setTimeout(function() {
      showButtons([
        { text: 'Check My Roof', primary: true },
        { text: 'No thanks' }
      ], function(val) {
        if (val === 'No thanks') {
          localStorage.setItem('ccg-dismissed', Date.now());
          win.classList.remove('open');
          return;
        }
        step2();
      });
    }, d + 300);
  }

  function step2() {
    var d = botMsg("What type of building do you manage?");
    setTimeout(function() {
      showButtons([
        { text: 'Apartment Complex' }, { text: 'Church / Worship' },
        { text: 'School / Educational' }, { text: 'Retail / Shopping Center' },
        { text: 'Office Building' }, { text: 'Industrial / Warehouse' },
        { text: 'Municipal / Government' }, { text: 'Other' }
      ], function(val) {
        answers.buildingType = val;
        step3();
      });
    }, d + 300);
  }

  function step3() {
    var d = botMsg("Roughly how old is your current roof?");
    setTimeout(function() {
      showButtons([
        { text: 'Less than 5 years' }, { text: '5-10 years' },
        { text: '10-20 years' }, { text: 'Over 20 years' }, { text: 'Not sure' }
      ], function(val) {
        answers.roofAge = val;
        step4();
      });
    }, d + 300);
  }

  function step4() {
    var d = botMsg("Do you currently have a preventative maintenance plan?");
    setTimeout(function() {
      showButtons([
        { text: 'Yes, with another company' }, { text: 'No, never had one' },
        { text: 'Had one but let it lapse' }, { text: 'Not sure what that is' }
      ], function(val) {
        answers.maintenance = val;
        step5();
      });
    }, d + 300);
  }

  function step5() {
    var d = botMsg("Approximately how large is the building? (square footage)");
    setTimeout(function() {
      showTextInput('e.g. 25,000 sq ft', function(val) {
        answers.buildingSize = val;
        step6();
      });
    }, d + 300);
  }

  function step6() {
    var response = getDynamicResponse();
    var d = botMsg(response);
    setTimeout(function() {
      var d2 = botMsg("Can we schedule a free drone roof inspection?", 600);
      setTimeout(function() {
        showButtons([
          { text: 'Yes, schedule a free inspection', primary: true },
          { text: 'Tell me more first' }
        ], function(val) {
          if (val === 'Tell me more first') {
            stepTellMore();
          } else {
            stepLeadCapture();
          }
        });
      }, d2 + 800);
    }, d + 300);
  }

  function stepTellMore() {
    var d = botMsg("Here's what our maintenance program includes:<br><br>✅ Semi-annual roof inspections<br>✅ Drone + thermal analysis<br>✅ Detailed digital condition reports<br>✅ Priority emergency response (24hr)<br>✅ Minor repair credits included<br>✅ Warranty documentation support<br><br>Most clients save 40-60% compared to waiting for emergency repairs.");
    setTimeout(function() {
      var d2 = botMsg("Ready to schedule your free inspection?", 600);
      setTimeout(function() {
        showButtons([
          { text: "Yes, let's do it", primary: true }
        ], function() {
          stepLeadCapture();
        });
      }, d2 + 800);
    }, d + 300);
  }

  function stepLeadCapture() {
    var d = botMsg("Awesome! Let me connect you with Teddy to schedule your free drone roof inspection.");
    setTimeout(function() {
      showLeadForm();
    }, d + 300);
  }

  // Auto-open after 15 seconds
  setTimeout(function() {
    if (!isOpen && !submitted) {
      toggleChat();
    }
  }, AUTO_OPEN_DELAY);
})();

/* Kawaii Notes Goal Widget by AnimationBlondie */

var kawaiiFieldData = {};
var kawaiiGoalAmount = 100;
var kawaiiProgress = 0;
var kawaiiCurrencySymbol = '$';
var kawaiiWasComplete = false;
var kawaiiLastMilestone = 0;
var kawaiiEffectDuration = 3000;
var kawaiiSeBaseProgress = 0; // Raw StreamElements session value (before manual offset)

// Manual offset persistence (localStorage)
function kawaiiGetStorageKey() {
  var eventType = kawaiiFieldData.eventType || 'manual';
  return 'kawaiiNotesOffset_' + eventType;
}

function kawaiiLoadOffset() {
  try {
    var saved = localStorage.getItem(kawaiiGetStorageKey());
    return saved ? parseInt(saved) || 0 : 0;
  } catch(e) { return 0; }
}

function kawaiiSaveOffset(newOffset) {
  try {
    localStorage.setItem(kawaiiGetStorageKey(), newOffset);
  } catch(e) {}
}

function kawaiiClearOffset() {
  try {
    localStorage.removeItem(kawaiiGetStorageKey());
  } catch(e) {}
}

var kawaiiIcons = {
  'star': '⭐', 'heart': '💖', 'sparkle': '✨', 'flower': '🌸', 'rainbow': '🌈',
  'moon': '🌙', 'cloud': '☁️', 'diamond': '💎', 'music': '🎵', 'gift': '🎁',
  'coin': '🪙', 'dollar': '💵', 'trophy': '🏆', 'crown': '👑', 'butterfly': '🦋',
  'candy': '🍬', 'cake': '🧁', 'cherry': '🍒', 'strawberry': '🍓', 'peach': '🍑',
  'lollipop': '🍭', 'donut': '🍩', 'icecream': '🍦', 'cookie': '🍪', 'milk': '🥛',
  'boba': '🧋', 'cat': '🐱', 'bunny': '🐰', 'bear': '🧸', 'paw': '🐾',
  'unicorn': '🦄', 'fairy': '🧚', 'angel': '👼', 'ribbon': '🎀', 'bow': '🎀',
  'balloon': '🎈', 'confetti': '🎊', 'magic': '🪄', 'crystal': '🔮', 'gem': '💠'
};

// Active elements
var kawaiiActiveTitleEl = null;
var kawaiiActiveValuesEl = null;

// Load widget
window.addEventListener('onWidgetLoad', function(obj) {
  kawaiiFieldData = obj.detail.fieldData;
  kawaiiGoalAmount = kawaiiFieldData.goalAmount || 100;
  kawaiiEffectDuration = (kawaiiFieldData.effectDuration || 3) * 1000;

  // Currency
  var currency = kawaiiFieldData.currency || '$';
  kawaiiCurrencySymbol = (currency === 'custom')
    ? (kawaiiFieldData.customCurrency || '$')
    : currency;

  kawaiiApplyTheme();

  // Get initial progress from session
  var eventType = kawaiiFieldData.eventType || 'manual';
  if (eventType !== 'manual') {
    var eventPeriod = kawaiiFieldData.eventPeriod || 'session';
    var seEventType = eventType;
    if (eventType === 'member') seEventType = 'subscriber';
    if (eventType === 'superchat') seEventType = 'tip';

    var eventIndex = seEventType + '-' + eventPeriod;
    var sessionData = obj.detail.session.data;

    if (sessionData && sessionData[eventIndex] !== undefined) {
      kawaiiProgress = parseFloat(sessionData[eventIndex]) || 0;
    }
  }

  // Store SE base progress and apply offsets
  kawaiiSeBaseProgress = kawaiiProgress;

  // 1. Apply startingOffset from Fields (permanent setting)
  var fieldsOffset = parseInt(kawaiiFieldData.startingOffset) || 0;

  // 2. Apply localStorage offset (dynamic from commands)
  var savedOffset = kawaiiLoadOffset();

  // Apply total offset
  var totalOffset = fieldsOffset + savedOffset;
  if (totalOffset !== 0) {
    kawaiiProgress = Math.max(0, kawaiiProgress + totalOffset);
  }

  kawaiiUpdateBar();

  // Preview effect
  if (kawaiiFieldData.previewEffect) {
    setTimeout(function() {
      document.documentElement.style.setProperty('--kawaii-progress', '100%');
      kawaiiSetValuesDisplay(kawaiiGoalAmount, kawaiiGoalAmount);
      kawaiiCelebrate();
    }, 500);
  }
});

// Session update
window.addEventListener('onSessionUpdate', function(obj) {
  var eventType = kawaiiFieldData.eventType || 'manual';
  if (eventType === 'manual') return;

  var eventPeriod = kawaiiFieldData.eventPeriod || 'session';
  var seEventType = eventType;
  if (eventType === 'member') seEventType = 'subscriber';
  if (eventType === 'superchat') seEventType = 'tip';

  var eventIndex = seEventType + '-' + eventPeriod;
  var sessionData = obj.detail.session.data;

  if (sessionData && sessionData[eventIndex] !== undefined) {
    var newProgress = parseFloat(sessionData[eventIndex]) || 0;
    if (newProgress !== kawaiiProgress) {
      kawaiiProgress = newProgress;
      kawaiiUpdateBar();
    }
  }
});

// Event received
window.addEventListener('onEventReceived', function(obj) {
  if (!obj.detail) return;

  var listener = obj.detail.listener;
  var event = obj.detail.event;

  // Chat commands
  if (listener === 'message') {
    kawaiiHandleCommand(event);
    return;
  }

  var eventType = kawaiiFieldData.eventType || 'manual';
  if (eventType === 'manual') return;

  var eventAmount = event.amount || 0;
  if (listener === 'follower-latest' && eventType === 'follower') {
    kawaiiProgress++;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (listener === 'subscriber-latest' && eventType === 'subscriber') {
    // Skip individual gift recipients (they come with gifted:true but no bulkGifted)
    // to avoid double-counting with the bulk event
    if (event.gifted && !event.bulkGifted) {
      return;
    }
    // For bulk/community gifts, use amount field for count
    var subCount = event.bulkGifted ? (event.amount || 1) : 1;
    kawaiiProgress += subCount;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (listener === 'tip-latest' && eventType === 'tip') {
    kawaiiProgress += eventAmount;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (listener === 'cheer-latest' && eventType === 'cheer') {
    kawaiiProgress += eventAmount;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if ((listener === 'subscriber-latest' || listener === 'sponsor-latest') && eventType === 'member') {
    kawaiiProgress++;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (listener === 'superchat-latest' && eventType === 'superchat') {
    kawaiiProgress += eventAmount;
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
});

function kawaiiApplyTheme() {
  var root = document.documentElement;
  var container = document.getElementById('kawaii-note-container');
  var theme = kawaiiFieldData.colorTheme || 'mint';

  // Remove old theme classes
  container.className = '';
  container.classList.add('theme-' + theme);

  // Apply custom colors if theme is custom
  if (theme === 'custom') {
    root.style.setProperty('--kawaii-note-bg', kawaiiFieldData.noteBgColor || '#fffef5');
    root.style.setProperty('--kawaii-bar-fill', kawaiiFieldData.barFillColor || '#a8e6cf');
    root.style.setProperty('--kawaii-border-color', kawaiiFieldData.borderColor || '#4a4a6a');
    root.style.setProperty('--kawaii-text-color', kawaiiFieldData.textColor || '#4a4a6a');
  }

  // Apply sizes
  root.style.setProperty('--kawaii-note-width', (kawaiiFieldData.noteWidth || 320) + 'px');
  root.style.setProperty('--kawaii-bar-height', (kawaiiFieldData.barHeight || 20) + 'px');
  root.style.setProperty('--kawaii-title-size', (kawaiiFieldData.titleFontSize || 14) + 'px');
  root.style.setProperty('--kawaii-values-size', (kawaiiFieldData.valuesFontSize || 18) + 'px');
  root.style.setProperty('--kawaii-icon-size', (kawaiiFieldData.iconSize || 28) + 'px');
  root.style.setProperty('--kawaii-corner-size', (kawaiiFieldData.cornerSize || 12) + 'px');

  // Setup Title
  kawaiiSetupTitle();

  // Setup Icon
  kawaiiSetupIcon();

  // Setup Values
  kawaiiSetupValues();

  // Corner decorations
  var corners = document.querySelectorAll('.corner');
  if (kawaiiFieldData.showCorners === false) {
    corners.forEach(function(c) { c.style.display = 'none'; });
  } else {
    corners.forEach(function(c) { c.style.display = ''; });
  }
}

function kawaiiSetupTitle() {
  var titleText = kawaiiFieldData.goalTitle || 'GOAL';
  var titlePosition = kawaiiFieldData.titlePosition || 'top';
  var titleAlign = kawaiiFieldData.titleAlign || 'row';

  // Parse title position (e.g., 'top-left' -> base: 'top', align: 'left')
  var titleParts = titlePosition.split('-');
  var titleBase = titleParts[0]; // top, bottom, left, right, hidden
  var titleHAlign = titleParts[1] || 'center'; // left, right, center

  // All possible title elements
  var titleTop = document.getElementById('kawaii-title-top');
  var titleBottom = document.getElementById('kawaii-title-bottom');
  var titleLeft = document.getElementById('kawaii-title-left');
  var titleRight = document.getElementById('kawaii-title-right');
  var titleBarTop = document.getElementById('kawaii-title-bar-top');
  var titleBarBottom = document.getElementById('kawaii-title-bar-bottom');
  var titleRowTop = document.getElementById('kawaii-title-row-top');
  var titleRowBottom = document.getElementById('kawaii-title-row-bottom');

  // Hide all titles and remove alignment classes
  [titleTop, titleBottom, titleLeft, titleRight, titleBarTop, titleBarBottom, titleRowTop, titleRowBottom].forEach(function(el) {
    if (el) {
      el.style.display = 'none';
      el.textContent = '';
      el.className = el.className.replace(/kawaii-title-\w+/g, '').trim();
      el.classList.remove('align-left', 'align-center', 'align-right');
      el.classList.add('kawaii-title');
    }
  });

  if (titleBase === 'hidden' || !titleText) {
    kawaiiActiveTitleEl = null;
    return;
  }

  var targetTitle = null;

  // Choose correct element based on position and alignment
  if (titleBase === 'top') {
    if (titleAlign === 'bar') {
      targetTitle = titleBarTop;
      targetTitle.classList.add('kawaii-title-bar');
    } else if (titleAlign === 'row') {
      targetTitle = titleRowTop;
      targetTitle.classList.add('kawaii-title-row');
    } else {
      targetTitle = titleTop;
    }
  } else if (titleBase === 'bottom') {
    if (titleAlign === 'bar') {
      targetTitle = titleBarBottom;
      targetTitle.classList.add('kawaii-title-bar');
    } else if (titleAlign === 'row') {
      targetTitle = titleRowBottom;
      targetTitle.classList.add('kawaii-title-row');
    } else {
      targetTitle = titleBottom;
    }
  } else if (titleBase === 'left') {
    targetTitle = titleLeft;
    targetTitle.classList.add('kawaii-title-side');
  } else if (titleBase === 'right') {
    targetTitle = titleRight;
    targetTitle.classList.add('kawaii-title-side');
  }

  if (targetTitle) {
    targetTitle.textContent = titleText;
    targetTitle.style.display = 'block';
    // Add alignment class for top/bottom positions
    if (titleBase === 'top' || titleBase === 'bottom') {
      targetTitle.classList.add('align-' + titleHAlign);
    }
    kawaiiActiveTitleEl = targetTitle;
  }
}

function kawaiiSetupIcon() {
  var showIcon = kawaiiFieldData.showIcon !== false;
  var iconPosition = kawaiiFieldData.iconPosition || 'left';
  var iconType = kawaiiFieldData.iconType || 'star';

  // Hide all icons first
  var iconLeft = document.getElementById('kawaii-icon-left');
  var iconRight = document.getElementById('kawaii-icon-right');

  iconLeft.style.display = 'none';
  iconRight.style.display = 'none';
  iconLeft.innerHTML = '';
  iconRight.innerHTML = '';

  if (!showIcon) return;

  var iconEl = iconPosition === 'right' ? iconRight : iconLeft;

  if (iconType === 'custom' && kawaiiFieldData.customIcon) {
    iconEl.innerHTML = '<img src="' + kawaiiFieldData.customIcon + '" style="width:100%;height:100%;">';
  } else {
    iconEl.textContent = kawaiiIcons[iconType] || '⭐';
  }

  iconEl.style.display = 'flex';
}

function kawaiiSetupValues() {
  var valuesPosition = kawaiiFieldData.valuesPosition || 'below';
  var valuesAlign = kawaiiFieldData.valuesAlign || 'row';

  // Parse values position (e.g., 'below-left' -> base: 'below', align: 'left')
  var valParts = valuesPosition.split('-');
  var valBase = valParts[0]; // below, above, inside, left, right, hidden
  var valHAlign = valParts[1] || 'center'; // left, right, center

  // All possible values elements
  var valAbove = document.getElementById('kawaii-values-above');
  var valBelow = document.getElementById('kawaii-values-below');
  var valTop = document.getElementById('kawaii-values-top');
  var valBottom = document.getElementById('kawaii-values-bottom');
  var valRowTop = document.getElementById('kawaii-values-row-top');
  var valRowBottom = document.getElementById('kawaii-values-row-bottom');
  var valLeft = document.getElementById('kawaii-values-left');
  var valRight = document.getElementById('kawaii-values-right');
  var valInside = document.getElementById('kawaii-values-inside');

  // Hide all values containers and remove classes
  [valAbove, valBelow, valTop, valBottom, valRowTop, valRowBottom, valLeft, valRight, valInside].forEach(function(el) {
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
      el.classList.remove('pos-left', 'pos-center', 'pos-right', 'align-left', 'align-center', 'align-right');
      el.classList.remove('kawaii-values-bar', 'kawaii-values-row', 'kawaii-values-side');
      el.classList.add('kawaii-values');
    }
  });

  if (valBase === 'hidden') {
    kawaiiActiveValuesEl = null;
    return;
  }

  var targetEl = null;

  // Choose correct element based on position and alignment
  if (valBase === 'above') {
    if (valuesAlign === 'bar') {
      targetEl = valAbove;
      targetEl.classList.add('kawaii-values-bar');
    } else if (valuesAlign === 'row') {
      targetEl = valRowTop;
      targetEl.classList.add('kawaii-values-row');
    } else {
      targetEl = valTop;
    }
    targetEl.classList.add('align-' + valHAlign);
  } else if (valBase === 'below') {
    if (valuesAlign === 'bar') {
      targetEl = valBelow;
      targetEl.classList.add('kawaii-values-bar');
    } else if (valuesAlign === 'row') {
      targetEl = valRowBottom;
      targetEl.classList.add('kawaii-values-row');
    } else {
      targetEl = valBottom;
    }
    targetEl.classList.add('align-' + valHAlign);
  } else if (valBase === 'left') {
    targetEl = valLeft;
    targetEl.classList.add('kawaii-values-side');
  } else if (valBase === 'right') {
    targetEl = valRight;
    targetEl.classList.add('kawaii-values-side');
  } else if (valBase === 'inside') {
    targetEl = valInside;
    if (valHAlign === 'left') targetEl.classList.add('pos-left');
    else if (valHAlign === 'right') targetEl.classList.add('pos-right');
    else targetEl.classList.add('pos-center');
  }

  if (targetEl) {
    // Create values content
    targetEl.innerHTML = '<span class="kawaii-current">0</span><span class="kawaii-separator">|</span><span class="kawaii-goal">100</span>';
    targetEl.style.display = 'flex';
    kawaiiActiveValuesEl = targetEl;

    // Set initial values
    var eventType = kawaiiFieldData.eventType || 'manual';
    var isTipType = (eventType === 'tip' || eventType === 'superchat');
    var goalEl = targetEl.querySelector('.kawaii-goal');
    if (goalEl) {
      goalEl.textContent = isTipType ? kawaiiCurrencySymbol + kawaiiGoalAmount : kawaiiGoalAmount;
    }
  }
}

function kawaiiSetValuesDisplay(current, goal) {
  if (!kawaiiActiveValuesEl) return;

  var eventType = kawaiiFieldData.eventType || 'manual';
  var isTipType = (eventType === 'tip' || eventType === 'superchat');

  var currEl = kawaiiActiveValuesEl.querySelector('.kawaii-current');
  var goalEl = kawaiiActiveValuesEl.querySelector('.kawaii-goal');

  if (currEl) {
    currEl.textContent = isTipType ? kawaiiCurrencySymbol + Math.round(current) : Math.round(current);
  }
  if (goalEl) {
    goalEl.textContent = isTipType ? kawaiiCurrencySymbol + Math.round(goal) : Math.round(goal);
  }
}

function kawaiiUpdateBar() {
  var pct = Math.min((kawaiiProgress / kawaiiGoalAmount) * 100, 100);
  var container = document.getElementById('kawaii-note-container');
  var overflow = kawaiiFieldData.overflowBehavior || 'show';
  var repeatMode = kawaiiFieldData.effectRepeat || 'once';

  document.documentElement.style.setProperty('--kawaii-progress', pct + '%');

  var displayValue = kawaiiProgress;
  var isComplete = kawaiiProgress >= kawaiiGoalAmount;

  if (isComplete && overflow === 'cap') {
    displayValue = kawaiiGoalAmount;
  }

  kawaiiSetValuesDisplay(displayValue, kawaiiGoalAmount);

  // Celebration
  if (isComplete) {
    if (!kawaiiWasComplete) {
      kawaiiWasComplete = true;
      setTimeout(kawaiiCelebrate, 500);
    } else if (repeatMode === 'every' && kawaiiProgress > kawaiiLastMilestone) {
      setTimeout(kawaiiCelebrate, 500);
    } else if (repeatMode === 'milestones') {
      var currentMilestone = Math.floor(kawaiiProgress / kawaiiGoalAmount);
      if (currentMilestone > kawaiiLastMilestone) {
        kawaiiLastMilestone = currentMilestone;
        setTimeout(kawaiiCelebrate, 500);
      }
    }
    kawaiiLastMilestone = kawaiiProgress;
  }

  // Hide if overflow is hide
  if (isComplete && overflow === 'hide') {
    container.style.opacity = '0';
    container.style.transition = 'opacity 0.5s ease';
  }
}

function kawaiiAnimateBar() {
  var container = document.getElementById('kawaii-note-container');
  var animation = kawaiiFieldData.barAnimation || 'bounce';

  container.classList.remove('kawaii-bounce', 'kawaii-wiggle', 'kawaii-pulse', 'kawaii-shake');
  void container.offsetWidth;

  if (animation !== 'none') {
    container.classList.add('kawaii-' + animation);
  }
}

function kawaiiCelebrate() {
  var effect = kawaiiFieldData.celebrationEffect || 'hearts';
  var effectsBox = document.getElementById('kawaii-effects');

  effectsBox.innerHTML = '';

  switch(effect) {
    case 'hearts': kawaiiEffectHearts(effectsBox); break;
    case 'stars': kawaiiEffectStars(effectsBox); break;
    case 'confetti': kawaiiEffectConfetti(effectsBox); break;
    case 'sparkles': kawaiiEffectSparkles(effectsBox); break;
    case 'flowers': kawaiiEffectFlowers(effectsBox); break;
    case 'rainbow': kawaiiEffectRainbow(effectsBox); break;
    case 'bubbles': kawaiiEffectBubbles(effectsBox); break;
    case 'butterflies': kawaiiEffectButterflies(effectsBox); break;
    case 'clouds': kawaiiEffectClouds(effectsBox); break;
    case 'candies': kawaiiEffectCandies(effectsBox); break;
    case 'bunnies': kawaiiEffectBunnies(effectsBox); break;
    case 'cats': kawaiiEffectCats(effectsBox); break;
    case 'mochi': kawaiiEffectMochi(effectsBox); break;
  }
}

function kawaiiEffectHearts(box) {
  var hearts = ['💖', '💕', '💗', '💓', '🩷'];
  var waves = Math.ceil(kawaiiEffectDuration / 500);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 8; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = hearts[Math.floor(Math.random()*hearts.length)];
          var size = 18 + Math.random() * 14;
          p.style.cssText = 'left:' + (10 + Math.random()*80) + '%;top:50%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1+Math.random()*0.5) + 's ease-out forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2000, p);
        }
      }, wave * 400);
    })(w);
  }
}

function kawaiiEffectStars(box) {
  var stars = ['⭐', '🌟', '✨', '💫', '⚡'];
  var waves = Math.ceil(kawaiiEffectDuration / 400);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 10; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = stars[Math.floor(Math.random()*stars.length)];
          var size = 16 + Math.random() * 16;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:' + (Math.random()*100) + '%;font-size:' + size + 'px;animation:kawaii-star-spin ' + (0.8+Math.random()*0.4) + 's ease forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 1500, p);
        }
      }, wave * 350);
    })(w);
  }
}

function kawaiiEffectConfetti(box) {
  var colors = ['#ffb7c5', '#a8e6cf', '#ffeaa7', '#c9b1ff', '#a3d5ff', '#ffd4a3'];
  var waves = Math.ceil(kawaiiEffectDuration / 600);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 15; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          var size = 6 + Math.random() * 8;
          var color = colors[Math.floor(Math.random()*colors.length)];
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:-10px;width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:' + (Math.random()>0.5?'50%':'2px') + ';animation:kawaii-confetti ' + (1+Math.random()*0.8) + 's ease forwards;animation-delay:' + (Math.random()*0.4) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 500);
    })(w);
  }
}

function kawaiiEffectSparkles(box) {
  var sparkles = ['✨', '💫', '⭐', '🌟'];
  var waves = Math.ceil(kawaiiEffectDuration / 350);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 8; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = sparkles[Math.floor(Math.random()*sparkles.length)];
          var size = 14 + Math.random() * 14;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:' + (Math.random()*100) + '%;font-size:' + size + 'px;animation:kawaii-sparkle ' + (0.6+Math.random()*0.4) + 's ease forwards;animation-delay:' + (Math.random()*0.2) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 1200, p);
        }
      }, wave * 300);
    })(w);
  }
}

function kawaiiEffectFlowers(box) {
  var flowers = ['🌸', '🌺', '🌷', '🌼', '💮', '🪻'];
  var waves = Math.ceil(kawaiiEffectDuration / 500);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 10; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = flowers[Math.floor(Math.random()*flowers.length)];
          var size = 16 + Math.random() * 14;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:-10px;font-size:' + size + 'px;animation:kawaii-confetti ' + (1.2+Math.random()*0.6) + 's ease forwards;animation-delay:' + (Math.random()*0.4) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 450);
    })(w);
  }
}

function kawaiiEffectRainbow(box) {
  var rainbows = ['🌈', '✨', '💖', '⭐', '🦋'];
  var waves = Math.ceil(kawaiiEffectDuration / 600);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 6; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = rainbows[Math.floor(Math.random()*rainbows.length)];
          var size = 20 + Math.random() * 16;
          p.style.cssText = 'left:' + (10 + Math.random()*80) + '%;top:40%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1.2+Math.random()*0.6) + 's ease-out forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 500);
    })(w);
  }
}

function kawaiiEffectBubbles(box) {
  var bubbles = ['🫧', '○', '◯', '●'];
  var waves = Math.ceil(kawaiiEffectDuration / 500);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 10; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = bubbles[Math.floor(Math.random()*bubbles.length)];
          var size = 14 + Math.random() * 18;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:90%;font-size:' + size + 'px;color:rgba(168,230,207,0.7);animation:kawaii-heart-float ' + (1.5+Math.random()*0.8) + 's ease-out forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2800, p);
        }
      }, wave * 400);
    })(w);
  }
}

function kawaiiEffectButterflies(box) {
  var butterflies = ['🦋', '🦋', '🦋', '✨'];
  var waves = Math.ceil(kawaiiEffectDuration / 600);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 6; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = butterflies[Math.floor(Math.random()*butterflies.length)];
          var size = 18 + Math.random() * 14;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:60%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1.5+Math.random()*0.8) + 's ease-out forwards;animation-delay:' + (Math.random()*0.4) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2800, p);
        }
      }, wave * 500);
    })(w);
  }
}

function kawaiiEffectClouds(box) {
  var clouds = ['☁️', '💭', '🤍', '✨'];
  var waves = Math.ceil(kawaiiEffectDuration / 700);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 5; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = clouds[Math.floor(Math.random()*clouds.length)];
          var size = 22 + Math.random() * 18;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:50%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1.8+Math.random()*0.8) + 's ease-out forwards;animation-delay:' + (Math.random()*0.4) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 3000, p);
        }
      }, wave * 600);
    })(w);
  }
}

function kawaiiEffectCandies(box) {
  var candies = ['🍬', '🍭', '🍫', '🧁', '🍩', '🍪'];
  var waves = Math.ceil(kawaiiEffectDuration / 500);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 10; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = candies[Math.floor(Math.random()*candies.length)];
          var size = 16 + Math.random() * 14;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:-10px;font-size:' + size + 'px;animation:kawaii-confetti ' + (1.2+Math.random()*0.6) + 's ease forwards;animation-delay:' + (Math.random()*0.4) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 450);
    })(w);
  }
}

function kawaiiEffectBunnies(box) {
  var bunnies = ['🐰', '🐇', '🥕', '💕'];
  var waves = Math.ceil(kawaiiEffectDuration / 600);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 6; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = bunnies[Math.floor(Math.random()*bunnies.length)];
          var size = 18 + Math.random() * 16;
          p.style.cssText = 'left:' + (10+Math.random()*80) + '%;top:50%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1.2+Math.random()*0.6) + 's ease-out forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 500);
    })(w);
  }
}

function kawaiiEffectCats(box) {
  var cats = ['🐱', '😺', '😸', '🐾', '💖'];
  var waves = Math.ceil(kawaiiEffectDuration / 600);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 6; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = cats[Math.floor(Math.random()*cats.length)];
          var size = 18 + Math.random() * 16;
          p.style.cssText = 'left:' + (10+Math.random()*80) + '%;top:50%;font-size:' + size + 'px;animation:kawaii-heart-float ' + (1.2+Math.random()*0.6) + 's ease-out forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2500, p);
        }
      }, wave * 500);
    })(w);
  }
}

function kawaiiEffectMochi(box) {
  var mochi = ['🍡', '🍥', '🥮', '✨', '💗'];
  var waves = Math.ceil(kawaiiEffectDuration / 500);
  for (var w = 0; w < waves; w++) {
    (function(wave) {
      setTimeout(function() {
        for (var i = 0; i < 8; i++) {
          var p = document.createElement('div');
          p.className = 'kawaii-particle';
          p.textContent = mochi[Math.floor(Math.random()*mochi.length)];
          var size = 16 + Math.random() * 14;
          p.style.cssText = 'left:' + (Math.random()*100) + '%;top:50%;font-size:' + size + 'px;animation:kawaii-star-spin ' + (1+Math.random()*0.5) + 's ease forwards;animation-delay:' + (Math.random()*0.3) + 's;';
          box.appendChild(p);
          setTimeout(function(el) { if(el.parentNode) el.parentNode.removeChild(el); }, 2000, p);
        }
      }, wave * 450);
    })(w);
  }
}

// Chat commands
function kawaiiHandleCommand(event) {
  if (!event.data || !event.data.text) return;

  var text = event.data.text.trim();
  var isBroadcaster = event.data.badges && event.data.badges.some(function(b) { return b.type === 'broadcaster'; });
  var isMod = event.data.badges && event.data.badges.some(function(b) { return b.type === 'moderator'; });

  var canUseCommands = isBroadcaster || (kawaiiFieldData.modCommands && isMod);
  if (!canUseCommands) return;

  var cmdAdd = kawaiiFieldData.cmdAdd || '!add';
  var cmdDrop = kawaiiFieldData.cmdDrop || '!drop';
  var cmdProgress = kawaiiFieldData.cmdProgress || '!progress';
  var cmdTarget = kawaiiFieldData.cmdTarget || '!target';
  var cmdClear = kawaiiFieldData.cmdClear || '!clear';

  var parts = text.split(' ');
  var cmd = parts[0].toLowerCase();
  var value = parseFloat(parts[1]) || 0;

  if (cmd === cmdAdd.toLowerCase() && value > 0) {
    kawaiiProgress += value;
    kawaiiSaveOffset(kawaiiProgress - kawaiiSeBaseProgress);
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (cmd === cmdDrop.toLowerCase() && value > 0) {
    kawaiiProgress = Math.max(0, kawaiiProgress - value);
    kawaiiSaveOffset(kawaiiProgress - kawaiiSeBaseProgress);
    kawaiiAnimateBar();
    kawaiiUpdateBar();
  }
  else if (cmd === cmdProgress.toLowerCase()) {
    kawaiiProgress = Math.max(0, value);
    kawaiiSaveOffset(kawaiiProgress - kawaiiSeBaseProgress);
    kawaiiWasComplete = false;
    kawaiiLastMilestone = 0;
    kawaiiUpdateBar();
  }
  else if (cmd === cmdTarget.toLowerCase() && value > 0) {
    kawaiiGoalAmount = value;
    kawaiiWasComplete = false;
    kawaiiLastMilestone = 0;
    kawaiiApplyTheme();
    kawaiiUpdateBar();
  }
  else if (cmd === cmdClear.toLowerCase()) {
    kawaiiProgress = 0;
    kawaiiWasComplete = false;
    kawaiiLastMilestone = 0;
    kawaiiClearOffset();
    kawaiiUpdateBar();
    document.getElementById('kawaii-note-container').style.opacity = '1';
  }
}

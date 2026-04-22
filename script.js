document.addEventListener('DOMContentLoaded', () => {
    // --- 0. UTILITY: BULLETPROOF SHUFFLE & PERSISTENCE ---
    function shuffleArray(array) {
        let newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    // --- 1. CORE ENGINE, STATE & SOUND ---
    let score = parseInt(localStorage.getItem('k8bh_score')) || 0;
    const savedOwned = JSON.parse(localStorage.getItem('k8bh_owned') || '[]');
    const owned = new Set(savedOwned);
    let isOrganicTheme = localStorage.getItem('k8bh_theme') === 'true';

    const scoreUI = document.getElementById('global-score');
    const scoreBox = document.getElementById('score-box');
    const sndWin = document.getElementById('sfx-win');
    const sndLose = document.getElementById('sfx-lose');

    function saveState() {
        localStorage.setItem('k8bh_score', score);
        localStorage.setItem('k8bh_owned', JSON.stringify(Array.from(owned)));
        localStorage.setItem('k8bh_theme', isOrganicTheme);
    }

    function addScore(pts) {
        score += pts; 
        scoreUI.textContent = score;
        
        // Retrigger the intense strobe flash
        scoreBox.classList.remove('success-pulse'); 
        void scoreBox.offsetWidth; 
        scoreBox.classList.add('success-pulse'); 
        
        saveState();
    }
    
    // Init state UI
    scoreUI.textContent = score;
    if(isOrganicTheme) document.body.classList.add('theme-introvert');

    // Theme Toggle Logic
    document.getElementById('theme-toggle').onclick = () => {
        isOrganicTheme = !isOrganicTheme;
        document.body.classList.toggle('theme-introvert', isOrganicTheme);
        saveState();
    };

    function playWin() { if(sndWin) { sndWin.currentTime=0; sndWin.play().catch(()=>{}); } }
    function playLose() { if(sndLose) { sndLose.currentTime=0; sndLose.play().catch(()=>{}); } }

    // --- 2. NAVIGATION & KEYBOARD SHORTCUTS ---
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    function switchView(id) {
        views.forEach(v => {
            v.style.display = 'none';
            v.classList.remove('active-view');
        });
        navItems.forEach(n => n.classList.remove('active'));
        
        const targetView = document.getElementById(id);
        const targetNav = document.querySelector(`[data-target="${id}"]`);
        
        if(targetView && targetNav) {
            targetView.style.display = 'block';
            void targetView.offsetWidth; 
            targetView.classList.add('active-view');
            targetNav.classList.add('active');
        }
    }
    navItems.forEach(n => n.addEventListener('click', () => switchView(n.dataset.target)));

    document.addEventListener('keydown', (e) => {
        if(document.activeElement.tagName === 'INPUT') return;
        if(e.code === 'Space') {
            e.preventDefault();
            if(audio.paused) document.getElementById('btn-play').click();
            else document.getElementById('btn-pause').click();
        }
        const keyMap = { 'Digit1':'player-view', 'Digit2':'shop-view', 'Digit3':'quiz-view', 'Digit4':'typer-view', 'Digit5':'sniper-view', 'Digit6':'memory-view', 'Digit7':'flex-view', 'Digit8':'arcade-view' };
        if(keyMap[e.code]) {
            const targetId = keyMap[e.code];
            if(targetId === 'player-view' || targetId === 'shop-view' || targetId === 'quiz-view' || targetId === 'typer-view' || owned.has(targetId.split('-')[0])) {
                switchView(targetId);
            }
        }
    });

    // --- 3. THE BLACK MARKET (SHOP) ---
    const shopItems = [
        { id: 'sniper', title: 'CSS Sniper Protocol', cost: 500, nav: 'nav-sniper' },
        { id: 'memory', title: 'Tag Match Protocol', cost: 1000, nav: 'nav-memory' },
        { id: 'flex', title: 'Flex Master control', cost: 2000, nav: 'nav-flex' },
        { id: 'arcade', title: 'Mega Arcade Expansion', cost: 5000, nav: 'nav-arcade' }
    ];
    let isShopProcessing = false;

    function renderShop() {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = `<div class="shop-card" style="background:var(--os-text); color:var(--os-bg);" onclick="document.querySelector('[data-target=\\'quiz-view\\']').click()"><h3>Basics</h3><div class="price" style="border-color:var(--os-bg);">OWNED</div></div>`;
        
        shopItems.forEach(item => {
            const isOwned = owned.has(item.id);
            if(isOwned) document.getElementById(item.nav).classList.remove('locked-nav');

            const card = document.createElement('div');
            card.className = `shop-card ${isOwned ? '' : 'locked'}`;
            if(isOwned) {
                card.style.background = 'var(--os-text)';
                card.style.color = 'var(--os-bg)';
            }
            
            card.innerHTML = `<h3>${item.title}</h3><div class="price" ${isOwned ? 'style="border-color:var(--os-bg);"' : ''}>${isOwned ? 'OWNED' : item.cost+' XP'}</div>`;
            
            card.onclick = () => {
                if(isShopProcessing) return;
                if(isOwned) {
                    switchView(`${item.id}-view`);
                } else if(score >= item.cost) {
                    isShopProcessing = true;
                    addScore(-item.cost); 
                    owned.add(item.id); 
                    saveState();
                    playWin();
                    document.getElementById(item.nav).classList.remove('locked-nav');
                    setTimeout(() => { renderShop(); isShopProcessing = false; }, 300);
                } else { 
                    playLose(); 
                    card.classList.add('error-shake'); 
                    setTimeout(() => card.classList.remove('error-shake'), 400); 
                }
            };
            grid.appendChild(card);
        });
    }
    renderShop();

    // --- 4. AUDIO VISUALIZER & ADVANCED PLAYER ---
    const audio = document.getElementById('audio-player');
    const canvas = document.getElementById('visualizer-canvas');
    const ctx = canvas.getContext('2d');
    const progressSlider = document.getElementById('audio-progress');
    const volumeSlider = document.getElementById('audio-volume');
    
    let actx, anl, src, data, isVis = false;
    canvas.width = 600; canvas.height = 200;

    document.getElementById('audio-upload').onchange = e => {
        if(e.target.files[0]) { 
            document.getElementById('track-name').textContent = e.target.files[0].name; 
            audio.src = URL.createObjectURL(e.target.files[0]); 
            audio.load();
        }
    };
    
    document.getElementById('btn-play').onclick = () => {
        if(!actx && audio.src) {
            actx = new (window.AudioContext || window.webkitAudioContext)();
            anl = actx.createAnalyser(); src = actx.createMediaElementSource(audio);
            src.connect(anl); anl.connect(actx.destination); anl.fftSize = 64;
            data = new Uint8Array(anl.frequencyBinCount);
        }
        if(actx && actx.state === 'suspended') actx.resume();
        if(audio.src) { audio.play(); if(!isVis) { isVis=true; drawVis(); } }
    };
    
    document.getElementById('btn-pause').onclick = () => audio.pause();

    audio.addEventListener('timeupdate', () => {
        if(!isNaN(audio.duration)) {
            progressSlider.value = (audio.currentTime / audio.duration) * 100;
        }
    });

    progressSlider.addEventListener('input', (e) => {
        if(!isNaN(audio.duration)) {
            audio.currentTime = (e.target.value / 100) * audio.duration;
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
    });
    
    function drawVis() {
        if(!isVis) return; requestAnimationFrame(drawVis);
        anl.getByteFrequencyData(data);
        
        const rootStyles = getComputedStyle(document.body);
        const vizBg = rootStyles.getPropertyValue('--os-bg').trim() || '#ffffff';
        const barColor = rootStyles.getPropertyValue('--os-text').trim() || '#000000';

        ctx.fillStyle = vizBg; ctx.fillRect(0,0,canvas.width,canvas.height);
        
        let bw = (canvas.width/anl.frequencyBinCount)*2.5, x=0;
        for(let i=0; i<anl.frequencyBinCount; i++) {
            let bh = data[i]*0.8;
            ctx.fillStyle = barColor; 
            // Draw pure blocks for 1-bit feel
            ctx.fillRect(x,canvas.height-bh,bw,bh);
            x += bw+4; 
        }
    }
    
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);

    // --- 5. THE 50 QUESTION GAUNTLET ---
    const q50=[
        {q:"1. HTML stands for?", o:["HyperText Markup Language", "Hyper Tool"], a:0},
        {q:"2. CSS targets what?", o:["Style", "Logic"], a:0},
        {q:"3. JS is used for?", o:["Database", "Interactivity"], a:1},
        {q:"4. Largest heading tag?", o:["<h1>", "<h6>"], a:0},
        {q:"5. Tag for a hyperlink?", o:["<link>", "<a>"], a:1},
        {q:"6. Paragraph tag?", o:["<p>", "<text>"], a:0},
        {q:"7. CSS property for bg?", o:["color", "background"], a:1},
        {q:"8. CSS text size?", o:["font-size", "text-size"], a:0},
        {q:"9. Make text bold HTML?", o:["<strong>", "<bld>"], a:0},
        {q:"10. Flexbox property?", o:["display: flex", "align: flex"], a:0},
        {q:"11. JS declare var?", o:["varOnly", "let"], a:1},
        {q:"12. JS strict equality?", o:["==", "==="], a:1},
        {q:"13. Array index starts at?", o:["1", "0"], a:1},
        {q:"14. CSS ID selector?", o:["#id", ".id"], a:0},
        {q:"15. CSS Class selector?", o:[".class", "#class"], a:0},
        {q:"16. Ordered list?", o:["<ul>", "<ol>"], a:1},
        {q:"17. Unordered list?", o:["<ul>", "<list>"], a:0},
        {q:"18. JS console print?", o:["console.log", "print()"], a:0},
        {q:"19. JS function keyword?", o:["def", "function"], a:1},
        {q:"20. Spacing inside?", o:["margin", "padding"], a:1},
        {q:"21. Spacing outside?", o:["margin", "padding"], a:0},
        {q:"22. Image tag?", o:["<pic>", "<img>"], a:1},
        {q:"23. Table row?", o:["<tr>", "<td>"], a:0},
        {q:"24. CSS border?", o:["border", "line"], a:0},
        {q:"25. Hide element?", o:["hide: true", "display: none"], a:1},
        {q:"26. Listen to click?", o:["addEventListener", "onClick"], a:0},
        {q:"27. DOM means?", o:["Document Object Model", "Data Object"], a:0},
        {q:"28. Line break?", o:["<br>", "<break>"], a:0},
        {q:"29. Input field?", o:["<input>", "<text>"], a:0},
        {q:"30. Center text?", o:["text-align: center", "align: center"], a:0},
        {q:"31. Change cursor?", o:["mouse: hand", "cursor: pointer"], a:1},
        {q:"32. Select by ID?", o:["getElementById", "selectID"], a:0},
        {q:"33. Select query?", o:["querySelector", "find()"], a:0},
        {q:"34. Boolean value?", o:["true/false", "1/0"], a:0},
        {q:"35. JS loop?", o:["loop()", "for()"], a:1},
        {q:"36. CSS grid?", o:["grid: on", "display: grid"], a:1},
        {q:"37. Absolute pos?", o:["pos: abs", "position: absolute"], a:1},
        {q:"38. Form tag?", o:["<form>", "<inputGroup>"], a:0},
        {q:"39. Parse integer?", o:["parseInt()", "toInteger()"], a:0},
        {q:"40. Random number?", o:["Math.random()", "random()"], a:0},
        {q:"41. Z-axis stack?", o:["z-index", "stack-order"], a:0},
        {q:"42. Meta data?", o:["<body>", "<head>"], a:1},
        {q:"43. Arrow func?", o:["() => {}", "func()"], a:0},
        {q:"44. Array map?", o:["array.map()", "array.loop()"], a:0},
        {q:"45. CSS smooth?", o:["animate", "transition"], a:1},
        {q:"46. Video tag?", o:["<video>", "<media>"], a:0},
        {q:"47. Promise state?", o:["Pending", "Start"], a:0},
        {q:"48. CSS root vars?", o:["$var", "--var"], a:1},
        {q:"49. Object to JSON?", o:["JSON.stringify()", "toJSON()"], a:0},
        {q:"50. JSON to Object?", o:["JSON.parse()", "toObj()"], a:0}
    ];
    let qIdx = 0, isQProcessing = false;
    const qUI = document.getElementById('quiz-container');

    function renderQ() {
        const optionA = q50[qIdx].o[0].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const optionB = q50[qIdx].o[1].replace(/</g, '&lt;').replace(/>/g, '&gt;');

        qUI.innerHTML = `
        <div class="quiz-question" id="q-box">${q50[qIdx].q}</div>
        <div class="options-grid">
            <button class="btn q-btn" id="q-opt-0">A. ${optionA}</button>
            <button class="btn q-btn" id="q-opt-1">B. ${optionB}</button>
        </div>
        <p style="margin-top:1.5rem; text-align:center;">PROTOCOL PROGRESS: ${qIdx+1}/50</p>`;

        document.getElementById('q-opt-0').onclick = () => checkQ(0);
        document.getElementById('q-opt-1').onclick = () => checkQ(1);
    }

    function checkQ(sel) {
        if(isQProcessing) return;
        isQProcessing = true;
        const qBox = document.getElementById('q-box');
        const btns = document.querySelectorAll('.q-btn');
        if(sel === q50[qIdx].a) { 
            playWin(); addScore(50); qBox.classList.add('success-pulse'); 
        } else { 
            playLose(); btns[sel].classList.add('error-shake'); qBox.classList.add('error-shake'); 
        }
        setTimeout(() => {
            qIdx++; if(qIdx >= q50.length) qIdx = 0; 
            renderQ(); isQProcessing = false;
        }, 500);
    }
    renderQ();

    // --- 6. ADVANCED CODE TYPER ---
    const tInp = document.getElementById('typer-input');
    const tDisp = document.getElementById('snippet-display');
    const tFb = document.getElementById('typer-feedback');
    const tWpm = document.getElementById('typer-wpm');
    
    const snips = [
        'document.getElementById("app");',
        'display: flex; justify-content: center;',
        'const arr = [1, 2, 3].map(n => n * 2);',
        'console.log("Win");', 
        'margin: 0 auto; box-sizing: border-box;'
    ];
    let curSnip = snips[0];
    let typeStart = null;
    
    tInp.addEventListener('focus', () => { if(!typeStart) typeStart = Date.now(); });

    tInp.oninput = e => {
        if(!typeStart) typeStart = Date.now();
        
        if(e.target.value === curSnip) { 
            const timeElapsedMins = (Date.now() - typeStart) / 60000;
            const words = curSnip.length / 5;
            const wpm = Math.round(words / timeElapsedMins);
            
            playWin(); 
            const pts = 30 + (wpm > 60 ? 20 : 0);
            addScore(pts); 
            
            e.target.value=''; 
            curSnip=snips[Math.floor(Math.random()*snips.length)]; 
            tDisp.textContent=curSnip; 
            
            tFb.textContent=`PERFECT! +${pts} XP`; 
            tWpm.textContent = `WPM: ${wpm}`;
            typeStart = null; 
        } else if(e.target.value.length>0 && curSnip.indexOf(e.target.value)!==0) { 
            playLose(); 
            e.target.value=''; 
            tFb.textContent="FAULT DETECTED!"; 
            typeStart = null; 
        }
    };

    // --- 7. SNIPER ---
    const sAr = document.getElementById('sniper-arena'), sTg = document.getElementById('sniper-target');
    let isSniperProcessing = false;

    function loadSniper() {
        sAr.innerHTML = ''; isSniperProcessing = false;
        const targs = shuffleArray([{s:'.box', h:'<div class="sniper-box" data-c="1">.box</div>'}, {s:'#btn', h:'<div class="sniper-box" data-c="1">#btn</div>'}, {s:'.nav', h:'<div class="sniper-box" data-c="1">.nav</div>'}]);
        const dists = ['<div class="sniper-box">div</div>', '<div class="sniper-box">.wrong</div>', '<div class="sniper-box">span</div>', '<div class="sniper-box">#err</div>'];
        
        let r = targs[0];
        sTg.textContent = `TARGET: ${r.s}`;
        
        let els = shuffleArray([r.h, dists[0], dists[1], dists[2]]);
        sAr.innerHTML = els.join('');
        
        sAr.querySelectorAll('.sniper-box').forEach(b => b.onclick = () => {
            if(isSniperProcessing) return;
            isSniperProcessing = true;
            if(b.dataset.c) { 
                playWin(); addScore(100); b.classList.add('success-pulse'); setTimeout(loadSniper, 500); 
            } else { 
                playLose(); b.classList.add('error-shake'); setTimeout(() => { b.classList.remove('error-shake'); isSniperProcessing = false; }, 400); 
            }
        });
    }
    loadSniper();

    // --- 8. MEMORY ---
    const mGrid = document.getElementById('memory-grid');
    const mPairs = [{t:'<a>',m:'Link'},{t:'Link',m:'<a>'},{t:'<img>',m:'Image'},{t:'Image',m:'<img>'},{t:'<h1>',m:'Heading'},{t:'Heading',m:'<h1>'}];
    let mFlips = [], isMemoryProcessing = false;

    function loadMem() {
        mGrid.innerHTML = '';
        shuffleArray(mPairs).forEach(p => {
            let c = document.createElement('div'); c.className = 'memory-card'; 
            c.innerHTML = `<span>${p.t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
            c.onclick = () => {
                if(isMemoryProcessing || c.classList.contains('flipped') || mFlips.length >= 2) return;
                c.classList.add('flipped'); mFlips.push({el:c, val:p.t, match:p.m});
                if(mFlips.length === 2) {
                    isMemoryProcessing = true;
                    if(mFlips[0].match === mFlips[1].val) { 
                        playWin(); addScore(200); 
                        setTimeout(()=>{
                            mFlips.forEach(f=>f.el.classList.add('matched')); mFlips=[]; isMemoryProcessing = false;
                            if(document.querySelectorAll('.memory-card.matched').length===mPairs.length) loadMem();
                        }, 500); 
                    } else { 
                        playLose(); mFlips.forEach(f=>f.el.classList.add('error-shake')); 
                        setTimeout(()=>{
                            mFlips.forEach(f=>f.el.classList.remove('flipped','error-shake')); mFlips=[]; isMemoryProcessing = false;
                        }, 800); 
                    }
                }
            }; 
            mGrid.appendChild(c);
        });
    }
    loadMem();

    // --- 9. FLEX MASTER ---
    const fAr = document.getElementById('flex-arena'), fGh = document.getElementById('flex-ghost'), fOpt = document.getElementById('flex-options'), fPrm = document.getElementById('flex-prompt');
    const fChals = [
        {t:'Center_Axis', g:'top:50%;left:50%;transform:translate(-50%,-50%);', c:'justify-content: center; align-items: center;', w:'justify-content: flex-end; align-items: flex-start;'},
        {t:'Top_Right', g:'top:0;right:0;', c:'justify-content: flex-end; align-items: flex-start;', w:'justify-content: center; align-items: center;'},
        {t:'Bottom_Left', g:'bottom:0;left:0;', c:'justify-content: flex-start; align-items: flex-end;', w:'justify-content: center; align-items: flex-start;'}
    ];
    let isFlexProcessing = false;

    function loadFlex() {
        let r = fChals[Math.floor(Math.random()*fChals.length)];
        fPrm.textContent = `TARGET ZONE: ${r.t}`; fAr.style=''; fGh.style=r.g;
        
        let opts = shuffleArray([r.c, r.w]);
        fOpt.innerHTML = '';
        opts.forEach(o => {
            let b = document.createElement('button'); b.className = 'btn'; b.textContent = o;
            b.onclick = () => {
                if(isFlexProcessing) return;
                isFlexProcessing = true;
                if(o===r.c) { 
                    playWin(); addScore(300); fAr.style=o; b.classList.add('success-pulse'); 
                    setTimeout(() => { loadFlex(); isFlexProcessing = false; }, 1000); 
                } else { 
                    playLose(); b.classList.add('error-shake'); 
                    setTimeout(() => { b.classList.remove('error-shake'); isFlexProcessing = false; }, 400); 
                }
            }; 
            fOpt.appendChild(b);
        });
    }
    loadFlex();

    // --- 10. MEGA ARCADE ---
    const arcUI = document.getElementById('arcade-container');
    let isArcadeProcessing = false;

    const arcTypes = [
        { type: "Hex Code", q: "Color #ff0000?", o: ["Red", "Blue"], a: 0 },
        { type: "Git CMD", q: "CMD to save changes?", o: ["git commit", "git pull"], a: 0 },
        { type: "HTTP Code", q: "Error 404 meaning?", o: ["Not Found", "OK"], a: 0 },
        { type: "Bug Hunt", q: "cosnt x = 1; Bug?", o: ["cosnt -> const", "x -> y"], a: 0 },
        { type: "Logic", q: "true && false?", o: ["false", "true"], a: 0 },
        { type: "CSS Opacity", q: "Make text invisible?", o: ["opacity: 0;", "color: none;"], a: 0 },
        { type: "Binary", q: "1010 Dec?", o: ["10", "8"], a: 0 },
        { type: "Emmet", q: "div.box expansion?", o: ["<div class='box'>", "<box>"], a: 0 },
        { type: "Array", q: "Add to end?", o: ["push()", "pop()"], a: 0 },
        { type: "Vim", q: "Vim: Cursor down?", o: ["j", "k"], a: 0 }
    ];

    function loadArcade() {
        let g = arcTypes[Math.floor(Math.random() * arcTypes.length)];
        
        let rawOptions = [
            { text: g.o[0].replace(/</g, '&lt;').replace(/>/g, '&gt;'), isCorrect: g.a === 0 },
            { text: g.o[1].replace(/</g, '&lt;').replace(/>/g, '&gt;'), isCorrect: g.a === 1 }
        ];
        let shuffledOpts = shuffleArray(rawOptions);
        
        arcUI.innerHTML = `
            <fieldset class="os-fieldset" style="padding:1rem;">
                <legend class="os-legend">MODE: ${g.type}</legend>
                <div class="quiz-question">${g.q}</div>
                <div class="arcade-grid">
                    <button class="btn arc-btn" data-correct="${shuffledOpts[0].isCorrect}">${shuffledOpts[0].text}</button>
                    <button class="btn arc-btn" data-correct="${shuffledOpts[1].isCorrect}">${shuffledOpts[1].text}</button>
                </div>
            </fieldset>
        `;
        
        document.querySelectorAll('.arc-btn').forEach(btn => {
            btn.onclick = function() {
                if(isArcadeProcessing) return;
                isArcadeProcessing = true;
                if(this.dataset.correct === "true") { 
                    playWin(); addScore(150); this.classList.add('success-pulse'); 
                    setTimeout(() => { loadArcade(); isArcadeProcessing = false; }, 500); 
                } else { 
                    playLose(); this.classList.add('error-shake'); 
                    setTimeout(() => { this.classList.remove('error-shake'); isArcadeProcessing = false; }, 400); 
                }
            };
        });
    }
    loadArcade();
});
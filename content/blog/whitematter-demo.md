---
title: Whitematter Demo
excerpt: Try the ResNet-18 classifier in your browser
date: 03/28/2026
---

# Whitematter Demo

A ResNet-18 trained from scratch on CIFAR-10 using [whitematter](/blog/whitematter) — running entirely in your browser via WebAssembly.

Upload any image and the model classifies it into one of 10 categories: airplane, automobile, bird, cat, deer, dog, frog, horse, ship, or truck.

<div id="whitematter-demo"></div>

<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>
<script>
(function() {
    const CLASSES = ['airplane', 'automobile', 'bird', 'cat', 'deer',
                     'dog', 'frog', 'horse', 'ship', 'truck'];
    const MEAN = [0.4914, 0.4822, 0.4465];
    const STD  = [0.2470, 0.2435, 0.2616];
    // Model hosted on GitHub Releases
    const MODEL_URL = 'https://github.com/hwang2409/whitematter/releases/download/v1.0/resnet18.onnx';

    const container = document.getElementById('whitematter-demo');
    container.innerHTML = `
        <style>
            .wm-drop { border:2px dashed #555; border-radius:12px; padding:32px; text-align:center;
                       cursor:pointer; transition:all 0.2s; margin:20px 0; }
            .wm-drop:hover { border-color:#2563eb; background:rgba(37,99,235,0.05); }
            .wm-drop.active { border-color:#2563eb; background:rgba(37,99,235,0.1); }
            .wm-preview { width:128px; height:128px; image-rendering:pixelated; border:1px solid #333;
                         border-radius:8px; margin:12px auto; display:block; }
            .wm-bar-row { display:flex; align-items:center; gap:8px; margin:4px 0; }
            .wm-label { width:90px; text-align:right; font-size:13px; opacity:0.7; }
            .wm-bar { height:22px; background:#2563eb; border-radius:4px; transition:width 0.3s;
                     display:flex; align-items:center; padding:0 8px; color:white; font-size:11px; min-width:40px; }
            .wm-bar-bg { flex:1; background:rgba(255,255,255,0.1); border-radius:4px; }
            #wm-status { font-size:13px; opacity:0.6; margin:8px 0; }
            #wm-results { margin-top:16px; }
        </style>
        <div class="wm-drop" id="wm-drop">
            <p style="margin:0">Drop an image here or click to upload</p>
            <input type="file" accept="image/*" id="wm-file" style="display:none">
        </div>
        <div id="wm-preview-wrap" style="display:none; text-align:center;">
            <canvas id="wm-canvas" class="wm-preview"></canvas>
            <p style="font-size:11px; opacity:0.4;">32x32 model input</p>
        </div>
        <div id="wm-results" style="display:none;"><h4>Predictions</h4><div id="wm-bars"></div></div>
        <p id="wm-status">Loading model...</p>
    `;

    let session = null;

    async function loadModel() {
        try {
            session = await ort.InferenceSession.create(MODEL_URL);
            document.getElementById('wm-status').textContent = 'Model loaded. Upload an image!';
        } catch(e) {
            document.getElementById('wm-status').textContent = 'Failed to load model: ' + e.message;
        }
    }

    async function classify(imgData) {
        if (!session) return;
        const t0 = performance.now();
        const f = new Float32Array(3*32*32);
        for (let c=0;c<3;c++) for (let h=0;h<32;h++) for (let w=0;w<32;w++) {
            const src = (h*32+w)*4+c;
            f[c*1024+h*32+w] = (imgData.data[src]/255.0 - MEAN[c]) / STD[c];
        }
        const tensor = new ort.Tensor('float32', f, [1,3,32,32]);
        const res = await session.run({input: tensor});
        const logits = res[Object.keys(res)[0]].data;
        const ms = (performance.now()-t0).toFixed(0);

        const mx = Math.max(...logits);
        const ex = logits.map(x=>Math.exp(x-mx));
        const sm = ex.reduce((a,b)=>a+b);
        const probs = ex.map(x=>x/sm);
        const sorted = CLASSES.map((n,i)=>({n,p:probs[i]})).sort((a,b)=>b.p-a.p);

        document.getElementById('wm-bars').innerHTML = sorted.slice(0,5).map(({n,p})=>`
            <div class="wm-bar-row">
                <span class="wm-label">${n}</span>
                <div class="wm-bar-bg"><div class="wm-bar" style="width:${(p*100).toFixed(1)}%">${(p*100).toFixed(1)}%</div></div>
            </div>`).join('');
        document.getElementById('wm-results').style.display='block';
        document.getElementById('wm-status').textContent=`${sorted[0].n} (${(sorted[0].p*100).toFixed(1)}%) — ${ms}ms`;
    }

    function processFile(file) {
        const r = new FileReader();
        r.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const c = document.getElementById('wm-canvas');
                c.width=32; c.height=32;
                const ctx = c.getContext('2d');
                const sz = Math.min(img.width,img.height);
                ctx.drawImage(img,(img.width-sz)/2,(img.height-sz)/2,sz,sz,0,0,32,32);
                document.getElementById('wm-preview-wrap').style.display='block';
                classify(ctx.getImageData(0,0,32,32));
            };
            img.src=e.target.result;
        };
        r.readAsDataURL(file);
    }

    const dz = document.getElementById('wm-drop');
    const fi = document.getElementById('wm-file');
    dz.onclick=()=>fi.click();
    fi.onchange=e=>{if(e.target.files[0])processFile(e.target.files[0])};
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('active')};
    dz.ondragleave=()=>dz.classList.remove('active');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('active');if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0])};

    loadModel();
})();
</script>

---

*Trained with whitematter's CUDA-accelerated cuDNN backend on an RTX 2070 SUPER. Model exported to ONNX, inference via ONNX Runtime Web (WASM). Zero server cost.*

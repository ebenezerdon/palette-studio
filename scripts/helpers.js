/* helpers.js
   Responsibilities: image sampling, color conversions, contrast math, simple k-means quantization
   Exposes: window.App = window.App || {}; window.App.Helpers = { ... }
*/
(function(window, $){
  window.App = window.App || {};
  const H = {};

  // Clamp utility
  H.clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };

  // RGB <-> HEX
  H.rgbToHex = function(r,g,b){
    const toHex = (n) => { const h = Number(n).toString(16); return h.length===1? '0'+h : h; };
    return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(Math.round(b))}`.toUpperCase();
  };

  H.hexToRgb = function(hex){
    if(!hex) return null;
    const h = hex.replace('#','');
    if(h.length===3){
      const [r,g,b] = h.split('').map(ch=>parseInt(ch+ch,16));
      return {r,g,b};
    }
    const r = parseInt(h.substr(0,2),16);
    const g = parseInt(h.substr(2,2),16);
    const b = parseInt(h.substr(4,2),16);
    return {r,g,b};
  };

  // Compute relative luminance per WCAG
  H.relativeLuminance = function(rgb){
    const srgb = ['r','g','b'].map(k => rgb[k]/255).map(function(c){
      return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
    });
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  };

  H.contrastRatio = function(hexA, hexB){
    const a = H.hexToRgb(hexA);
    const b = H.hexToRgb(hexB);
    if(!a || !b) return null;
    const L1 = H.relativeLuminance(a);
    const L2 = H.relativeLuminance(b);
    const brightest = Math.max(L1,L2);
    const darkest = Math.min(L1,L2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return Math.round(ratio*100)/100;
  };

  // Simple k-means color quantization
  H.kmeans = function(pixels, k, iterations){
    // pixels: array of {r,g,b}
    if(pixels.length===0) return [];
    k = Math.max(1, Math.min(k, 16));
    iterations = iterations || 8;

    // initialize centers by sampling
    const centers = [];
    const used = {};
    while(centers.length < k){
      const idx = Math.floor(Math.random() * pixels.length);
      const key = `${pixels[idx].r}-${pixels[idx].g}-${pixels[idx].b}`;
      if(!used[key]){ centers.push(Object.assign({}, pixels[idx])); used[key]=true; }
    }

    for(let it=0; it<iterations; it++){
      const clusters = new Array(k).fill(0).map(()=>({sumR:0,sumG:0,sumB:0,count:0}));
      for(const p of pixels){
        let best = 0, bestD = Infinity;
        for(let i=0;i<k;i++){
          const c = centers[i];
          const d = Math.pow(p.r-c.r,2) + Math.pow(p.g-c.g,2) + Math.pow(p.b-c.b,2);
          if(d < bestD){ bestD=d; best=i; }
        }
        const cl = clusters[best]; cl.sumR += p.r; cl.sumG += p.g; cl.sumB += p.b; cl.count += 1;
      }
      for(let i=0;i<k;i++){
        const cl = clusters[i];
        if(cl.count>0){ centers[i] = { r: cl.sumR/cl.count, g: cl.sumG/cl.count, b: cl.sumB/cl.count }; }
      }
    }

    // compute counts for sorting by prominence
    const counts = new Array(k).fill(0);
    for(const p of pixels){
      let best = 0, bestD = Infinity;
      for(let i=0;i<k;i++){
        const c = centers[i];
        const d = Math.pow(p.r-c.r,2) + Math.pow(p.g-c.g,2) + Math.pow(p.b-c.b,2);
        if(d<bestD){ bestD=d; best=i; }
      }
      counts[best] = counts[best] + 1;
    }

    const results = centers.map((c,i)=>({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b), count: counts[i] }));
    results.sort((a,b)=>b.count - a.count);
    return results;
  };

  // Sample pixels from an image element into limited array
  H.sampleImage = function(img, maxSamples){
    maxSamples = maxSamples || 2000;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    // draw
    try{ ctx.drawImage(img, 0, 0, canvas.width, canvas.height); } catch(e){ return []; }
    const w = canvas.width, h = canvas.height;
    // sample pixels at a step interval to reduce count
    const total = w*h;
    const step = Math.ceil(Math.sqrt(total / maxSamples));
    const pixels = [];
    try{
      const data = ctx.getImageData(0,0,w,h).data;
      for(let y=0;y<h;y+=step){
        for(let x=0;x<w;x+=step){
          const idx = (y*w + x)*4;
          const r = data[idx]; const g = data[idx+1]; const b = data[idx+2]; const a = data[idx+3];
          if(a === 0) continue; // transparent
          // skip near-white/near-black optionally? Keep all
          pixels.push({r,g,b});
        }
      }
    } catch(e){ return []; }
    return pixels;
  };

  // Create an Image object from file or dataURL, returns Promise
  H.loadImageFromFile = function(file){
    return new Promise(function(resolve, reject){
      const reader = new FileReader();
      reader.onerror = function(){ reject(new Error('File read error')); };
      reader.onload = function(){
        const img = new Image();
        img.onload = function(){ resolve(img); };
        img.onerror = function(){ reject(new Error('Image load error')); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Demo image data URL (small scenic photo encoded) - fallback remote image to avoid large inline data
  H.demoImageUrl = 'https://images.unsplash.com/photo-1503264116251-35a269479413?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=6e1b7dac1a1822b12e3c3dca5b3f1e5a';

  window.App.Helpers = H;
})(window, jQuery);

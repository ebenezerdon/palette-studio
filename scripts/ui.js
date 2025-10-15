/* ui.js
   Responsibilities: UI rendering, event wiring, state management, persistence.
   Defines window.App.init and window.App.render per contract.
*/
(function(window, $){
  window.App = window.App || {};
  const H = window.App.Helpers;
  const STORAGE_KEY = 'palette-studio-v1';

  // Application state
  window.App.state = {
    palettes: [],
    active: [],
    extracted: [],
    image: null
  };

  // Persistence helpers
  function loadStorage(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return [];
      return JSON.parse(raw);
    } catch(e){ console.error('Failed to load storage', e); return []; }
  }
  function saveStorage(palettes){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes)); } catch(e){ console.error('Save failed', e); }
  }

  // Render helpers
  function renderSwatches(colors){
    const $sw = $('#swatches').empty();
    colors.forEach((c)=>{
      const hex = H.rgbToHex(c.r,c.g,c.b);
      const $tile = $(`<div class="swatch" tabindex="0" role="button" aria-label="Add ${hex} to palette" title="Add ${hex}"></div>`);
      $tile.css('background', hex);
      $tile.data('hex', hex);
      $tile.on('click keypress', function(e){ if(e.type==='keypress' && e.key!=='Enter') return; App.addToActive($(this).data('hex')); });
      // right-click to copy
      $tile.on('contextmenu', function(e){ e.preventDefault(); App.copyHex($(this).data('hex')); });
      $sw.append($tile);
    });
  }

  function renderActive(){
    const $a = $('#active-palette').empty();
    window.App.state.active.forEach((hex, idx)=>{
      const $c = $(`<div class="flex items-center gap-2 rounded-md p-2 bg-white border" style="min-width:110px"></div>`);
      const $sw = $(`<div class="w-12 h-12 rounded-md" title="${hex}" style="background:${hex}"></div>`);
      const $meta = $(`<div class="flex-1 text-sm">
        <div class="font-mono">${hex}</div>
        <div class="text-xs text-gray-500">#${idx+1}</div>
      </div>`);
      const $remove = $(`<button class="btn-ghost text-sm">Remove</button>`);
      $remove.on('click', function(){ App.removeFromActive(idx); });
      $c.append($sw, $meta, $remove);
      $a.append($c);
    });
  }

  function renderPalettes(){
    const $list = $('#palettes-list').empty();
    window.App.state.palettes.forEach((p)=>{
      const $tpl = $($('#tpl-palette-card').html());
      $tpl.attr('data-id', p.id);
      $tpl.find('.name').text(p.name);
      const $colors = $tpl.find('.colors');
      p.colors.forEach(hex=>{
        const $c = $(`<div class="w-8 h-8 rounded-md" title="${hex}" style="background:${hex}"></div>`);
        $c.on('click', function(){ App.addToActive(hex); });
        // draggable for contrast
        $c.attr('draggable','true');
        $c.on('dragstart', function(ev){ ev.originalEvent.dataTransfer.setData('text/plain', hex); });
        $colors.append($c);
      });

      $tpl.find('.btn-delete').on('click', function(){ App.deletePalette(p.id); });
      $tpl.find('.btn-export-local').on('click', function(){ App.exportPalette(p.id); });
      $list.append($tpl);
    });
  }

  // App methods that will be exposed
  const App = window.App;

  App.loadPalettes = function(){
    App.state.palettes = loadStorage();
  };

  App.savePalettes = function(){ saveStorage(App.state.palettes); };

  App.addToActive = function(hex){
    if(!hex) return;
    if(App.state.active.indexOf(hex) !== -1) return; // prevent duplicates
    App.state.active.push(hex);
    renderActive();
    App.notify(`Added ${hex}`);
  };

  App.removeFromActive = function(idx){
    App.state.active.splice(idx,1);
    renderActive();
  };

  App.copyHex = function(hex){
    try{ navigator.clipboard.writeText(hex); App.notify(`${hex} copied`); } catch(e){ console.warn('Copy failed', e); }
  };

  App.saveActiveAsPalette = function(name){
    if(!name || App.state.active.length===0) { App.notify('Please add colors and provide a name'); return; }
    const id = 'p_' + Date.now();
    const p = { id, name: name.trim(), colors: App.state.active.slice() };
    App.state.palettes.unshift(p);
    App.savePalettes();
    renderPalettes();
    App.state.active = [];
    renderActive();
    $('#palette-name').val('');
    App.notify('Palette saved');
  };

  App.deletePalette = function(id){
    App.state.palettes = App.state.palettes.filter(p=>p.id!==id);
    App.savePalettes();
    renderPalettes();
    App.notify('Palette deleted');
  };

  App.exportPalette = function(id){
    const p = App.state.palettes.find(x=>x.id===id);
    if(!p) return;
    const data = JSON.stringify(p, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${p.name.replace(/[^a-z0-9]/gi,'_') || 'palette'}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  App.exportAll = function(){
    const data = JSON.stringify(App.state.palettes, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `palettes.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  App.clearAll = function(){
    if(!confirm('Clear all saved palettes?')) return;
    App.state.palettes = [];
    App.savePalettes();
    renderPalettes();
    App.notify('All palettes cleared');
  };

  // Notification simple toast
  App.notify = function(msg){
    const $t = $(`<div class="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-md shadow-md" role="status">${msg}</div>`);
    $('body').append($t);
    $t.hide().fadeIn(200);
    setTimeout(()=>{ $t.fadeOut(400, function(){ $(this).remove(); }); }, 1400);
  };

  // Image handling
  App.loadDemoImage = function(){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){ App.renderImagePreview(img); App.processImage(img); };
    img.onerror = function(){ App.notify('Demo image failed to load'); };
    img.src = H.demoImageUrl;
  };

  App.renderImagePreview = function(img){
    // Preview canvas is only available in the studio (app.html). If absent,
    // bail gracefully to avoid runtime errors when scripts run on other pages
    // (e.g., index.html). We still keep the image in state so processing can
    // proceed if needed.
    const canvas = document.getElementById('preview-canvas');
    const wrap = $('#preview-wrap');
    if(!canvas || !canvas.getContext){
      App.state.image = img;
      // reveal the wrap if present (no-op on pages without it)
      if(wrap && wrap.removeClass) wrap.removeClass('hidden');
      return;
    }

    const maxW = 800;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    wrap.removeClass('hidden');
  };

  App.processImage = function(img){
    try{
      const count = Number($('#count').val()) || 6;
      // sample pixels
      const pixels = H.sampleImage(img, 2500);
      if(pixels.length===0){ App.notify('Image could not be sampled'); return; }
      const colors = H.kmeans(pixels, count, 9);
      App.state.extracted = colors;
      renderSwatches(colors);
      App.state.image = img;
    } catch(e){ console.error(e); App.notify('Failed to extract colors'); }
  };

  // Contrast UI update
  function updateContrastUI(){
    const fore = $('#contrast-fore').css('background-color');
    const back = $('#contrast-back').css('background-color');
    // convert rgb(a) string to hex
    const toHex = function(rgbstr){
      // robust converter: accept hex (#fff or #ffffff) or rgb/rgba strings and tolerate whitespace.
      if(!rgbstr) return '#000000';
      const s = String(rgbstr).trim();
      // already hex
      if(s[0] === '#'){
        const h = s.toUpperCase();
        if(h.length === 4){ // shorthand #rgb -> #rrggbb
          return ('#' + h[1]+h[1] + h[2]+h[2] + h[3]+h[3]).toUpperCase();
        }
        return h;
      }
      // match rgb/rgba with optional spaces
      const m = s.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
      if(m){
        return H.rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
      }
      // fallback for 'transparent' or unexpected formats
      return '#000000';
    };
    const fh = toHex(fore); const bh = toHex(back);
    $('#fore-hex').text(fh); $('#back-hex').text(bh);
    const ratio = H.contrastRatio(fh, bh) || 0;
    $('#contrast-val').text(ratio+':1');
    const badges = [];
    // WCAG pass checks
    badges.push({label:'AA (normal)', pass: ratio >= 4.5});
    badges.push({label:'AA (large)', pass: ratio >= 3});
    badges.push({label:'AAA (normal)', pass: ratio >= 7});
    $('#contrast-badges').empty();
    badges.forEach(b=>{
      const $b = $(`<div class="px-2 py-1 rounded-md text-xs font-semibold ${b.pass? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${b.label}</div>`);
      $('#contrast-badges').append($b);
    });
  }

  // Drag-drop handling for contrast boxes
  function wireContrastDrops(){
    $('#contrast-fore, #contrast-back').on('dragover', function(e){ e.preventDefault(); $(this).addClass('ring ring-indigo-200'); });
    $('#contrast-fore, #contrast-back').on('dragleave drop', function(e){ e.preventDefault(); $(this).removeClass('ring ring-indigo-200'); });
    $('#contrast-fore').on('drop', function(e){ const hex = e.originalEvent.dataTransfer.getData('text/plain'); if(hex) $(this).css('background', hex); updateContrastUI(); });
    $('#contrast-back').on('drop', function(e){ const hex = e.originalEvent.dataTransfer.getData('text/plain'); if(hex) $(this).css('background', hex); updateContrastUI(); });
  }

  // File and drop handlers
  function wireFileHandlers(){
    const $drop = $('#drop-area');
    $drop.on('dragover', function(e){ e.preventDefault(); $(this).addClass('border-indigo-300'); });
    $drop.on('dragleave drop', function(e){ e.preventDefault(); $(this).removeClass('border-indigo-300'); });
    $drop.on('drop', function(e){ e.preventDefault(); const dt = e.originalEvent.dataTransfer; if(dt && dt.files && dt.files.length){ handleFile(dt.files[0]); } });

    $('#select-file').on('click', function(){ $('#file-input').trigger('click'); });
    $('#file-input').on('change', function(e){ const f = e.target.files && e.target.files[0]; if(f) handleFile(f); $(this).val(''); });
    $('#btn-sample').on('click', function(){ App.loadDemoImage(); });

    function handleFile(file){
      if(!file.type.startsWith('image/')){ App.notify('Please choose an image file'); return; }
      H.loadImageFromFile(file).then(function(img){ App.renderImagePreview(img); App.processImage(img); }).catch(function(){ App.notify('Could not load image'); });
    }
  }

  // Attach UI controls
  function wireUiActions(){
    $('#count').on('input change', function(){ $('#count-val').text($(this).val()); if(App.state.image) App.processImage(App.state.image); });
    $('#save-palette').on('click', function(){ const name = $('#palette-name').val().trim(); App.saveActiveAsPalette(name); });
    $('#btn-new').on('click', function(){ App.state.active = []; renderActive(); $('#palette-name').focus(); });
    $('#btn-export').on('click', function(){ App.exportAll(); });
    $('#btn-clear').on('click', function(){ App.clearAll(); });

    // allow dropping color hex text on contrast boxes
    wireContrastDrops();
  }

  // Public API required by contract
  App.init = function(){
    try{
      App.loadPalettes();
      App.state.active = [];
      renderPalettes();
      renderActive();
      wireFileHandlers();
      wireUiActions();
      // keyboard accessibility: allow pressing Enter on swatches handled in render
      // if there are no palettes, show demo image
      if(App.state.palettes.length===0){ App.loadDemoImage(); }
      // initial contrast read
      updateContrastUI();
      // allow dropping hex text onto contrast boxes
      $(document).on('drop', function(e){ e.preventDefault(); });
      // handle paste for color hex
      $(document).on('paste', function(e){ const txt = (e.originalEvent.clipboardData || window.clipboardData).getData('text'); if(/^#?[0-9A-Fa-f]{6}$/.test(txt.trim())){ const hex = txt.trim().startsWith('#')? txt.trim() : '#'+txt.trim(); App.addToActive(hex); } });
    } catch(e){ console.error('App.init error', e); }
  };

  App.render = function(){
    try{
      renderPalettes();
      renderActive();
      renderSwatches(App.state.extracted);
      updateContrastUI();
    } catch(e){ console.error('App.render error', e); }
  };

  // Utility for creating a palette id when saving manually
  App.createPalette = function(name, colors){ return { id: 'p_'+Date.now(), name: name || 'Untitled', colors: colors || [] }; };

  // Delete all saved - used by UI wire
  App.deleteAll = function(){ localStorage.removeItem(STORAGE_KEY); App.loadPalettes(); renderPalettes(); };

  // expose small helpers for tests
  App._internal = { renderPalettes, renderActive, renderSwatches };

})(window, jQuery);

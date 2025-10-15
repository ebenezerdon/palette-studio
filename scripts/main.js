/* main.js - application entry point
   Must call App.init() and App.render() after verifying the contract
*/
$(function(){
  try {
    const hasApp = !!window.App;
    const hasInit = hasApp && typeof window.App.init === 'function';
    const hasRender = hasApp && typeof window.App.render === 'function';
    if (!hasApp || !hasInit || !hasRender) {
      const details = {
        hasApp,
        hasInit,
        hasRender,
        availableKeys: hasApp ? Object.keys(window.App || {}) : [],
        hint: "Define in scripts/ui.js: window.App = window.App || {}; App.init = function(){}; App.render = function(){};"
      };
      console.error('[Contract] Missing App.init/App.render', details);
      return;
    }
    // initialize
    window.App.init();
    window.App.render();
  } catch (e) {
    console.error('Initialization failed', e);
  }
});

const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/4CA79C727DDD9105A24D65C26A93D658');
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(data.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.onopen = r);

  console.log('Reloading page...');
  await send('Page.navigate', { url: 'http://localhost:3001/v2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking Sign in button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#signin-button').click()"
  });
  await new Promise(r => setTimeout(r, 800));

  console.log('Focusing & typing email...');
  await send('Runtime.evaluate', {
    expression: "(() => { const el = document.querySelector('input[type=email]'); el.value = ''; el.focus(); })()"
  });
  await send('Input.insertText', { text: 'mohan.founder@profeshare.ai' });

  console.log('Focusing & typing password...');
  await send('Runtime.evaluate', {
    expression: "(() => { const el = document.querySelector('input[type=password]'); el.value = ''; el.focus(); })()"
  });
  await send('Input.insertText', { text: 'Password123!Secure' });

  await new Promise(r => setTimeout(r, 500));

  console.log('Clicking Sign In submit button...');
  await send('Runtime.evaluate', {
    expression: "document.querySelector('#auth-modal button[type=submit]').click()"
  });

  console.log('Waiting 3.5s for Supabase auth to complete...');
  await new Promise(r => setTimeout(r, 3500));

  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const pill = document.querySelector('.user-email-text');
      const modal = document.querySelector('#auth-modal');
      const err = document.querySelector('.auth-alert');
      return JSON.stringify({
        emailText: pill ? pill.innerText : null,
        modalIsOpen: modal ? modal.open : false,
        errorText: err ? err.innerText : null
      });
    })()`,
    returnByValue: true
  });

  const parsed = JSON.parse(check.result.value);
  console.log('Auth check result:', parsed);

  // Take screenshot
  const shot = await send('Page.captureScreenshot');
  fs.writeFileSync('/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4/supabase_auth_verified.png', Buffer.from(shot.data, 'base64'));
  console.log('Screenshot saved to artifact directory.');

  ws.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

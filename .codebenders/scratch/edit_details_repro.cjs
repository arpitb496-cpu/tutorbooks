const { chromium } = require('/Users/arpitbhardwaj/.npm/_npx/41b79885fbdb2a18/node_modules/playwright');
const BASE = 'http://localhost:5179';
const EMAIL = 'test@example.com';
const KEY = 'tutorbooks.v1:' + EMAIL;
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  const countFor = (cid) => page.evaluate(([k, id]) => {
    const d = JSON.parse(localStorage.getItem(k) || 'null');
    if (!d) return { raw: null };
    return { total: d.invoices.length, forCustomer: d.invoices.filter((i) => i.customerId === id).length,
      amounts: d.invoices.filter((i) => i.customerId === id).map((i) => i.amount) };
  }, [KEY, cid]);
  const customerId = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).customers.find((c) => c.name === 'Test Parent')?.id, KEY);

  await page.goto(BASE);
  await page.getByRole('button', { name: 'New here? Sign up' }).or(page.getByText('New here? Sign up')).click();
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill('secret1');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.waitForTimeout(500);
  if (await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible()) {
    await page.locator('input[type="email"]').fill(EMAIL);
    await page.locator('input[type="password"]').fill('secret1');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Add customer', exact: true }).first().click();
  const addForm = page.locator('form').filter({ hasText: 'Student name' });
  await addForm.getByLabel('Student name').fill('Test Parent');
  await addForm.getByLabel('Parent phone').fill('9000000001');
  await addForm.getByLabel('Monthly fee (₹)').fill('2000');
  await addForm.getByLabel('Due day of month (1-28)').fill('5');
  await addForm.getByRole('button', { name: 'Add customer', exact: true }).click();
  await page.waitForTimeout(300);

  const cid = await customerId();
  console.log('customerId =', cid);
  console.log('before any invoice:', JSON.stringify(await countFor(cid)));

  await page.locator('[id^="item-"]').filter({ hasText: 'Test Parent' }).getByRole('button', { name: 'Create invoice' }).click();
  await page.waitForTimeout(300);
  console.log('after quick Create invoice:', JSON.stringify(await countFor(cid)));

  await page.getByRole('button', { name: 'Edit details' }).click();
  await page.waitForTimeout(300);
  const editForm = page.locator('form').filter({ hasText: 'Repeat monthly' });
  console.log('edit form amount prefilled =', await editForm.getByLabel('Amount (₹)').inputValue());
  console.log('invoices for customer when Edit details opened:', JSON.stringify(await countFor(cid)));
  await editForm.getByLabel('Amount (₹)').fill('2500');
  await editForm.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await page.waitForTimeout(400);

  const toast = await page.locator('[role="status"]').textContent().catch(() => null);
  console.log('toast text =', JSON.stringify(toast));
  console.log('after save:', JSON.stringify(await countFor(cid)));
  await page.screenshot({ path: '.codebenders/scratch/after_save.png', fullPage: true });
  console.log('console errors:', JSON.stringify(consoleErrors));
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });

// Node.js: node --test zadanie5/tests/shop.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

function setup(random = 0.9) {
  const scriptPath = join(__dirname, '../js/script.js');
  assert.ok(existsSync(scriptPath), 'The shop must provide its JavaScript implementation');
  const timers = [];
  // Only timer and initial DOM bindings are substituted. UI is checked in the browser.
  const context = vm.createContext({
    document: { getElementById: () => ({ addEventListener() {}, setAttribute() {} }) },
    Intl, structuredClone, Error,
    Math: Object.assign(Object.create(Math), { random: () => random }),
    setTimeout: (callback) => timers.push(callback),
  });
  vm.runInContext(readFileSync(scriptPath, 'utf8'), context);
  return { context, timers };
}

test('discount creates new prices without changing the original items', () => {
  const { context } = setup();
  const items = [{ id: 1, price: 8.5 }, { id: 2, price: 12 }];
  const result = context.applyDiscount(items);
  assert.equal(result[0].price, 7.65);
  assert.equal(result[1].price, 10.8);
  assert.equal(items[0].price, 8.5);
  assert.equal(items[1].price, 12);
  assert.notEqual(result[0], items[0]);
  assert.equal(context.applyDiscount([]).length, 0);
});

test('successful loading returns independent objects including nested tags', async () => {
  const { context, timers } = setup();
  const firstRequest = context.loadProducts();
  assert.equal(typeof firstRequest.then, 'function');
  timers.at(-1)();
  const first = await firstRequest;
  first[0].price = 1;
  first[0].tags.push('changed');
  const secondRequest = context.loadProducts();
  timers.at(-1)();
  const second = await secondRequest;
  assert.equal(second.length, 3);
  assert.equal(second[0].price, 8.5);
  assert.equal(second[0].tags.includes('changed'), false);
});

test('failed loading rejects so the UI can display an error and allow retry', async () => {
  const { context, timers } = setup(0.1);
  const request = context.loadProducts();
  const rejection = assert.rejects(request, /Server neodpovedá/);
  timers.at(-1)();
  await rejection;
});

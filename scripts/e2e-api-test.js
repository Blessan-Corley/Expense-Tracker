/**
 * End-to-End API Test Script
 * Tests full user flow: Register → Login → Transactions → Budgets → Goals → Recurring
 * Run: node scripts/e2e-api-test.js [baseUrl]
 * Default baseUrl: http://localhost:5000/api
 */
const http = require('http');
const https = require('https');

const BASE_URL = process.argv[2] || 'http://localhost:5000/api';
const isHttps = BASE_URL.startsWith('https');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.startsWith('http') ? path : BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

    const lib = isHttps ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function run() {
  const results = { passed: 0, failed: 0, tests: [] };
  let token = null;
  let userId = null;

  function pass(name) {
    results.passed++;
    results.tests.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  }
  function fail(name, msg) {
    results.failed++;
    results.tests.push({ name, ok: false, msg });
    console.log(`  ✗ ${name}: ${msg}`);
  }

  console.log('\n=== E2E API Test ===');
  console.log(`Base URL: ${BASE_URL}\n`);

  const email = `${unique()}@example.com`;
  const password = 'TestPassword123';

  try {
    // 1. Health
    const health = await request('GET', '/health');
    if (health.status === 200 && health.data?.status === 'healthy') {
      pass('Health check');
    } else {
      fail('Health check', `status=${health.status} db=${health.data?.database}`);
    }

    // 2. Register
    const reg = await request('POST', '/auth/register', {
      name: 'E2E User',
      email,
      password,
    });
    if (reg.status === 201 && reg.data?.token) {
      token = reg.data.token;
      userId = reg.data.user?.id;
      pass('Register');
    } else {
      fail('Register', reg.data?.message || `status=${reg.status}`);
    }

    if (!token) {
      console.log('\nCannot continue without auth. Stopping.\n');
      return results;
    }

    // 3. Login
    const login = await request('POST', '/auth/login', { email, password });
    if (login.status === 200 && login.data?.token) {
      pass('Login');
    } else {
      fail('Login', login.data?.message || `status=${login.status}`);
    }

    // 4. Get /me
    const me = await request('GET', '/auth/me', null, token);
    if (me.status === 200 && me.data?.user) {
      pass('Get current user');
    } else {
      fail('Get current user', `status=${me.status}`);
    }

    // 5. Add transaction (expense)
    const tx1 = await request(
      'POST',
      '/transactions',
      {
        type: 'EXPENSE',
        amount: 50,
        category: 'Food & Dining',
        description: 'E2E test expense',
        date: new Date().toISOString(),
        paymentMethod: 'Card',
      },
      token
    );
    if (tx1.status === 201 && tx1.data?.transaction) {
      pass('Add expense transaction');
    } else {
      fail('Add expense', tx1.data?.message || `status=${tx1.status}`);
    }

    // 6. Add transaction (income)
    const tx2 = await request(
      'POST',
      '/transactions',
      {
        type: 'INCOME',
        amount: 1000,
        category: 'Salary',
        description: 'E2E test income',
        date: new Date().toISOString(),
        paymentMethod: 'Bank Transfer',
      },
      token
    );
    if (tx2.status === 201 && tx2.data?.transaction) {
      pass('Add income transaction');
    } else {
      fail('Add income', tx2.data?.message || `status=${tx2.status}`);
    }

    // 7. Get transactions
    const txs = await request('GET', '/transactions', null, token);
    if (txs.status === 200 && Array.isArray(txs.data?.transactions)) {
      pass('Get transactions');
    } else {
      fail('Get transactions', `status=${txs.status}`);
    }

    // 8. Get analytics
    const analytics = await request('GET', '/transactions/analytics', null, token);
    if (analytics.status === 200 && analytics.data?.monthly) {
      pass('Get analytics');
    } else {
      fail('Get analytics', `status=${analytics.status}`);
    }

    // 9. Add budget
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const budget = await request(
      'POST',
      '/budgets',
      {
        category: 'Food & Dining',
        amount: 500,
        period: 'monthly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      token
    );
    if (budget.status === 201 && budget.data?.budget) {
      pass('Add budget');
    } else {
      fail('Add budget', budget.data?.message || `status=${budget.status}`);
    }

    // 10. Get budgets
    const budgets = await request('GET', '/budgets', null, token);
    if (budgets.status === 200 && Array.isArray(budgets.data?.budgets)) {
      pass('Get budgets');
    } else {
      fail('Get budgets', `status=${budgets.status}`);
    }

    // 11. Add goal
    const goalDate = new Date();
    goalDate.setMonth(goalDate.getMonth() + 3);
    const goal = await request(
      'POST',
      '/goals',
      {
        title: 'E2E Test Goal',
        description: 'Save for test',
        targetAmount: 5000,
        targetDate: goalDate.toISOString(),
        category: 'OTHER',
      },
      token
    );
    if (goal.status === 201 && goal.data?.goal) {
      pass('Add goal');
    } else {
      fail('Add goal', goal.data?.message || `status=${goal.status}`);
    }

    // 12. Get goals
    const goals = await request('GET', '/goals', null, token);
    if (goals.status === 200 && Array.isArray(goals.data?.goals)) {
      pass('Get goals');
    } else {
      fail('Get goals', `status=${goals.status}`);
    }

    // 13. Add recurring
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 7);
    const recurring = await request(
      'POST',
      '/recurring',
      {
        type: 'EXPENSE',
        amount: 99,
        category: 'Subscriptions',
        description: 'E2E recurring',
        paymentMethod: 'Card',
        frequency: 'MONTHLY',
        nextDate: nextDate.toISOString(),
      },
      token
    );
    if (recurring.status === 201 && recurring.data?.recurringTransaction) {
      pass('Add recurring transaction');
    } else {
      fail('Add recurring', recurring.data?.message || `status=${recurring.status}`);
    }

    // 14. Edge case: invalid auth
    const badAuth = await request('GET', '/transactions', null, 'invalid-token');
    if (badAuth.status === 401) {
      pass('Reject invalid token');
    } else {
      fail('Reject invalid token', `expected 401 got ${badAuth.status}`);
    }

    // 15. Edge case: short password on register
    const shortPw = await request('POST', '/auth/register', {
      name: 'Test',
      email: `${unique()}@x.com`,
      password: 'short',
    });
    if (shortPw.status === 400) {
      pass('Reject short password');
    } else {
      fail('Reject short password', `expected 400 got ${shortPw.status}`);
    }
  } catch (err) {
    fail('Unexpected error', err.message);
  }

  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.passed}, Failed: ${results.failed}`);
  process.exit(results.failed > 0 ? 1 : 0);
}

run();

export const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'TindAPI Documentation',
    version: '1.0.0',
    description: 'TindAPI - Personal Finance Tracking API',
  },
  servers: [{ url: 'http://localhost:8787' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      EmailSignIn: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tindecken@gmail.com' },
          password: { type: 'string', format: 'password', example: 'rivaldo' },
          rememberMe: { type: 'boolean', default: false, example: false },
        },
        required: ['email', 'password'],
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Auth ───────────────────────────────────────────
    '/tind_tracking/auth/sign-in/{provider}': {
      get: {
        tags: ['Auth'],
        summary: 'Sign in with social provider (Google)',
        parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '302': { description: 'Redirect to provider' } },
      },
    },
    '/tind_tracking/auth/sign-in/email': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailSignIn' } } },
        },
        responses: {
          '200': { description: 'Sign in successful' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },

    // ── Wallets ────────────────────────────────────────
    '/tind_tracking/wallets/balances': {
      get: {
        tags: ['Wallets'],
        summary: 'Get all wallet balances for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Wallet balances' } },
      },
    },

    // ── Month Periods ──────────────────────────────────
    '/tind_tracking/month-periods': {
      get: {
        tags: ['Month Periods'],
        summary: 'List month periods (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated month periods' } },
      },
      post: {
        tags: ['Month Periods'],
        summary: 'Create a new month period',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMonthPeriod' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
      put: {
        tags: ['Month Periods'],
        summary: 'Update a month period',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMonthPeriod' } } },
        },
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Month Periods'],
        summary: 'Delete a month period (if not in use)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
        },
        responses: { '200': { description: 'Deleted' }, '400': { description: 'In use' } },
      },
    },
    '/tind_tracking/month-periods/current': {
      get: {
        tags: ['Month Periods'],
        summary: 'Get the active month period spanning the current date',
        responses: { '200': { description: 'Current month period' } },
      },
    },

    // ── Categories ─────────────────────────────────────
    '/tind_tracking/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated categories' } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a new category',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategory' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
      put: {
        tags: ['Categories'],
        summary: 'Update a category',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCategory' } } },
        },
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category (reassigns refs to Uncategorized)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { categoryId: { type: 'string' } }, required: ['categoryId'] } } },
        },
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Transactions ───────────────────────────────────
    '/tind_tracking/transaction/transfer': {
      post: {
        tags: ['Transactions'],
        summary: 'Transfer between two wallets with optional fee',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRequest' } } },
        },
        responses: { '200': { description: 'Transfer completed' } },
      },
    },
    '/tind_tracking/transaction/standard': {
      post: {
        tags: ['Transactions'],
        summary: 'Create a standard transaction (income/expense)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStandardTransaction' } } },
        },
        responses: { '200': { description: 'Created' } },
      },
    },
    '/tind_tracking/mustpay-transactions/pay': {
      post: {
        tags: ['Transactions'],
        summary: 'Pay towards a must-pay transaction',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PayMustpayRequest' } } },
        },
        responses: { '200': { description: 'Payment completed' } },
      },
    },

    // ── Must-Pay Items ─────────────────────────────────
    '/tind_tracking/mustpay': {
      get: {
        tags: ['Must-Pay Items'],
        summary: 'List must-pay items for active month period',
        parameters: [{ name: 'monthPeriodId', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'List of must-pay items' } },
      },
      post: {
        tags: ['Must-Pay Items'],
        summary: 'Create a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMustpay' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
      put: {
        tags: ['Must-Pay Items'],
        summary: 'Update a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMustpay' } } },
        },
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Must-Pay Items'],
        summary: 'Delete a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
        },
        responses: { '200': { description: 'Deleted' } },
      },
    },

    // ── Rates ──────────────────────────────────────────
    '/tind_tracking/rates': {
      get: {
        tags: ['Rates'],
        summary: 'List exchange rates (paginated, filterable by currency pair)',
        parameters: [
          { name: 'currencyFrom', in: 'query', schema: { type: 'string' } },
          { name: 'currencyTo', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated rates' } },
      },
      post: {
        tags: ['Rates'],
        summary: 'Create an exchange rate entry',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRate' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
      put: {
        tags: ['Rates'],
        summary: 'Update an exchange rate',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRate' } } },
        },
        responses: { '200': { description: 'Updated' } },
      },
      delete: {
        tags: ['Rates'],
        summary: 'Delete an exchange rate',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
        },
        responses: { '200': { description: 'Deleted' } },
      },
    },
    '/tind_tracking/rates/latest': {
      get: {
        tags: ['Rates'],
        summary: 'Get latest rate for a currency pair',
        parameters: [
          { name: 'currencyFrom', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'currencyTo', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Latest rate' } },
      },
    },
  },
}

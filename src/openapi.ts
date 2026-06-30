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
      GenericResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object', description: 'Response payload (varies by endpoint)' },
          totalRecords: { type: 'number', description: 'Total record count (paginated GETs only)' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error message' },
          data: { type: 'null' },
        },
      },
      EmailSignIn: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'tindecken@gmail.com' },
          password: { type: 'string', format: 'password', example: 'rivaldo' },
          rememberMe: { type: 'boolean', default: false, example: false },
        },
        required: ['email', 'password'],
      },

      // ── Wallets ──
      CreateWallet: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'My Wallet' },
          isDefault: { type: 'boolean', default: false },
          isDelegated: { type: 'boolean', default: false },
          isSaving: { type: 'boolean', default: false },
        },
        required: ['name'],
      },
      UpdateWallet: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          isDefault: { type: 'boolean' },
          isDelegated: { type: 'boolean' },
          isSaving: { type: 'boolean' },
          balance: { type: 'number' },
        },
        required: ['id'],
      },
      DeleteWalletRequest: {
        type: 'object',
        properties: {
          walletId: { type: 'string' },
        },
        required: ['walletId'],
      },

      // ── Categories ──
      CreateCategory: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Groceries' },
          note: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['name'],
      },
      UpdateCategory: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          note: { type: 'string' },
          icon: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['id'],
      },
      DeleteCategoryRequest: {
        type: 'object',
        properties: {
          categoryId: { type: 'string' },
        },
        required: ['categoryId'],
      },

      // ── Month Periods ──
      CreateMonthPeriod: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'January 2026' },
          startDate: { type: 'number', description: 'Unix timestamp in milliseconds', example: 1704067200000 },
          endDate: { type: 'number', description: 'Unix timestamp in milliseconds', example: 1706745599000 },
          isActive: { type: 'boolean', default: false },
        },
        required: ['name', 'startDate', 'endDate'],
      },
      UpdateMonthPeriod: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          startDate: { type: 'number', description: 'Unix timestamp in milliseconds' },
          endDate: { type: 'number', description: 'Unix timestamp in milliseconds' },
          isActive: { type: 'boolean' },
        },
        required: ['id'],
      },
      DeleteMonthPeriodRequest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },

      // ── Standard Transactions ──
      StandardTransactionItem: {
        type: 'object',
        properties: {
          walletId: { type: 'string', description: 'Defaults to user default wallet' },
          delegatedWalletId: { type: 'string', description: 'If set, amount is also deducted from this wallet' },
          amount: { type: 'number', description: 'Positive = expense, negative = income', example: 50000 },
          currencyId: { type: 'string', description: 'Defaults to default currency' },
          date: { type: 'number', description: 'Unix timestamp in ms (defaults to now)' },
          note: { type: 'string', example: 'Lunch' },
          categoryId: { type: 'string', description: 'Defaults to Uncategorized' },
          monthPeriodId: { type: 'string', description: 'Defaults to active period' },
        },
        required: ['amount', 'note'],
      },
      CreateStandardTransactionRequest: {
        type: 'array',
        items: { $ref: '#/components/schemas/StandardTransactionItem' },
      },

      // ── Transfers ──
      TransferRequest: {
        type: 'object',
        properties: {
          fromWalletId: { type: 'string' },
          toWalletId: { type: 'string' },
          amount: { type: 'number', description: 'Must be positive', example: 100000 },
          fee: { type: 'number' },
          currencyId: { type: 'string', description: 'Defaults to default currency' },
          monthPeriodId: { type: 'string', description: 'Defaults to active period' },
          note: { type: 'string' },
        },
        required: ['fromWalletId', 'toWalletId', 'amount'],
      },

      // ── Must-Pay Transactions ──
      CreateMustpay: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Rent' },
          targetAmount: { type: 'number', description: 'Must be positive', example: 5000000 },
          monthPeriodId: { type: 'string', description: 'Defaults to active period' },
          currencyId: { type: 'string', description: 'Defaults to default currency' },
          categoryId: { type: 'string' },
        },
        required: ['name', 'targetAmount'],
      },
      UpdateMustpay: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          targetAmount: { type: 'number' },
          remainingAmount: { type: 'number' },
          currencyId: { type: 'string' },
          categoryId: { type: 'string' },
        },
        required: ['id'],
      },
      DeleteMustpayRequest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },

      // ── Must-Pay Payments ──
      PayMustpayItem: {
        type: 'object',
        properties: {
          payWalletId: { type: 'string' },
          mustpayTransactionId: { type: 'string' },
          amount: { type: 'number', description: 'Must be positive', example: 1000000 },
          note: { type: 'string' },
        },
        required: ['payWalletId', 'mustpayTransactionId', 'amount'],
      },
      PayMustpayRequest: {
        type: 'array',
        items: { $ref: '#/components/schemas/PayMustpayItem' },
      },

      // ── Undo Transactions ──
      UndoTransactionItem: {
        type: 'object',
        properties: {
          transactionId: { type: 'string' },
        },
        required: ['transactionId'],
      },
      UndoTransactionRequest: {
        type: 'array',
        items: { $ref: '#/components/schemas/UndoTransactionItem' },
      },

      // ── Rates ──
      CreateRate: {
        type: 'object',
        properties: {
          currencyFrom: { type: 'string', example: 'USD' },
          currencyTo: { type: 'string', example: 'VND' },
          rate: { type: 'number', example: 25500 },
          dateRate: { type: 'number', description: 'Unix timestamp in milliseconds' },
        },
        required: ['currencyFrom', 'currencyTo', 'rate', 'dateRate'],
      },
      UpdateRate: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          currencyFrom: { type: 'string' },
          currencyTo: { type: 'string' },
          rate: { type: 'number' },
          dateRate: { type: 'number', description: 'Unix timestamp in milliseconds' },
        },
        required: ['id'],
      },
      DeleteRateRequest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
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
        security: [],
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string', example: 'google' } },
        ],
        responses: {
          '302': { description: 'Redirect to provider' },
        },
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
    '/tind_tracking/wallets': {
      get: {
        tags: ['Wallets'],
        summary: 'List all wallets for the authenticated user',
        responses: {
          '200': { description: 'Array of wallet objects' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Wallets'],
        summary: 'Create a new wallet',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateWallet' } } },
        },
        responses: {
          '201': { description: 'Wallet created' },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Wallets'],
        summary: 'Update a wallet (balance only if not used in transactions)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateWallet' } } },
        },
        responses: {
          '200': { description: 'Wallet updated' },
          '400': { description: 'Validation error or balance blocked (wallet in use)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Wallets'],
        summary: 'Delete a wallet (only if not used in any transactions)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteWalletRequest' } } },
        },
        responses: {
          '200': { description: 'Wallet deleted' },
          '400': { description: 'Wallet is used in transactions', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/tind_tracking/wallets/summary': {
      get: {
        tags: ['Wallets'],
        summary: 'Get wallet summary including balances, must-pay totals, and daily spending',
        responses: {
          '200': { description: 'Summary object with balances, mustpay totals, per-day spending' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ── Categories ─────────────────────────────────────
    '/tind_tracking/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List categories (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'string', default: '1' } },
          { name: 'limit', in: 'query', schema: { type: 'string', default: '10' } },
        ],
        responses: {
          '200': { description: 'Paginated categories with totalRecords' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a new category',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCategory' } } },
        },
        responses: {
          '201': { description: 'Category created' },
          '400': { description: 'Duplicate name', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Categories'],
        summary: 'Update a category',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCategory' } } },
        },
        responses: {
          '200': { description: 'Category updated' },
          '400': { description: 'Duplicate name', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Category not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category (reassigns references to Uncategorized)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteCategoryRequest' } } },
        },
        responses: {
          '200': { description: 'Category deleted, references reassigned' },
          '400': { description: 'Uncategorized category not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Category not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ── Transactions ───────────────────────────────────
    '/tind_tracking/transactions': {
      post: {
        tags: ['Transactions'],
        summary: 'Create standard transactions (expenses/income). Send an array of items.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateStandardTransactionRequest' } } },
        },
        responses: {
          '200': { description: 'Array of created transaction objects' },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/tind_tracking/transactions/undo': {
      post: {
        tags: ['Transactions'],
        summary: 'Undo transactions — reverses wallet balances and deletes the transactions. Send an array of transaction IDs.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UndoTransactionRequest' } } },
        },
        responses: {
          '200': { description: 'Transactions undone successfully' },
          '400': { description: 'Empty array', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/tind_tracking/transfer': {
      post: {
        tags: ['Transactions'],
        summary: 'Transfer between two wallets with optional fee',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRequest' } } },
        },
        responses: {
          '200': { description: 'Transfer completed' },
          '400': { description: 'Insufficient balance or same wallet', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/tind_tracking/mustpay-transactions/pay': {
      post: {
        tags: ['Transactions'],
        summary: 'Pay towards must-pay transaction(s). Send an array of payments.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PayMustpayRequest' } } },
        },
        responses: {
          '200': { description: 'Payment(s) completed' },
          '400': { description: 'Amount exceeds remaining or insufficient balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Must-pay transaction or wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ── Must-Pay Items ─────────────────────────────────
    '/tind_tracking/mustpay': {
      get: {
        tags: ['Must-Pay Items'],
        summary: 'List must-pay items (defaults to active month period)',
        parameters: [
          { name: 'monthPeriodId', in: 'query', schema: { type: 'string' }, description: 'Optional, defaults to active period' },
        ],
        responses: {
          '200': { description: 'Array of must-pay items' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Must-Pay Items'],
        summary: 'Create a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMustpay' } } },
        },
        responses: {
          '201': { description: 'Must-pay item created' },
          '400': { description: 'targetAmount must be positive', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Must-Pay Items'],
        summary: 'Update a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMustpay' } } },
        },
        responses: {
          '200': { description: 'Must-pay item updated' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Must-pay item not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Must-Pay Items'],
        summary: 'Delete a must-pay item',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMustpayRequest' } } },
        },
        responses: {
          '200': { description: 'Must-pay item deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Must-pay item not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ── Month Periods ──────────────────────────────────
    '/tind_tracking/month-periods': {
      get: {
        tags: ['Month Periods'],
        summary: 'List month periods (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'string', default: '1' } },
          { name: 'limit', in: 'query', schema: { type: 'string', default: '10' } },
        ],
        responses: {
          '200': { description: 'Paginated month periods with totalRecords' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Month Periods'],
        summary: 'Create a new month period',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateMonthPeriod' } } },
        },
        responses: {
          '201': { description: 'Month period created' },
          '400': { description: 'Duplicate name', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Month Periods'],
        summary: 'Update a month period',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateMonthPeriod' } } },
        },
        responses: {
          '200': { description: 'Month period updated' },
          '400': { description: 'Duplicate name', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Month period not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Month Periods'],
        summary: 'Delete a month period (only if not used in transactions or must-pay items)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteMonthPeriodRequest' } } },
        },
        responses: {
          '200': { description: 'Month period deleted' },
          '400': { description: 'Month period is in use', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Month period not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/tind_tracking/month-periods/current': {
      get: {
        tags: ['Month Periods'],
        summary: 'Get the active month period spanning the current date',
        responses: {
          '200': { description: 'Current month period' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'No active month period found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
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
          { name: 'page', in: 'query', schema: { type: 'string', default: '1' } },
          { name: 'limit', in: 'query', schema: { type: 'string', default: '10' } },
        ],
        responses: {
          '200': { description: 'Paginated rates with totalRecords' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Rates'],
        summary: 'Create an exchange rate entry',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRate' } } },
        },
        responses: {
          '201': { description: 'Rate created' },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      put: {
        tags: ['Rates'],
        summary: 'Update an exchange rate',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRate' } } },
        },
        responses: {
          '200': { description: 'Rate updated' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Rate not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Rates'],
        summary: 'Delete an exchange rate',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeleteRateRequest' } } },
        },
        responses: {
          '200': { description: 'Rate deleted' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Rate not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
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
        responses: {
          '200': { description: 'Latest rate object' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'No rate found for this pair', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
}

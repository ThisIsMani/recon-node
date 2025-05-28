import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import config from './index'; // Now TS

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Ledger API',
      version: '1.0.0',
      description: 'API documentation for the Smart Ledger backend service, managing financial accounts and transactions.',
    },
    servers: [
      {
        url: `http://localhost:${config.port || 3000}/api`, // Base URL for API
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        AccountInput: {
          type: 'object',
          required: [
            'account_name',
            'account_type',
            'currency'
          ],
          properties: {
            account_name: {
              type: 'string',
              description: 'Name of the account.',
              example: 'Main Operating Account'
            },
            account_type: {
              $ref: '#/components/schemas/AccountTypeEnum'
            },
            currency: {
              type: 'string',
              description: '3-letter currency code (ISO 4217).',
              example: 'USD'
            }
          }
        },
        AccountResponse: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the account.',
              example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
            },
            merchant_id: {
              type: 'string',
              description: 'Identifier of the merchant this account belongs to.',
              example: 'merchant_123'
            },
            account_name: {
              type: 'string',
              description: 'Name of the account.',
              example: 'Main Operating Account'
            },
            account_type: {
              $ref: '#/components/schemas/AccountTypeEnum'
            },
            currency: {
              type: 'string',
              description: '3-letter currency code.',
              example: 'USD'
            }
          }
        },
        AccountWithBalanceResponse: {
          allOf: [
            { $ref: '#/components/schemas/AccountResponse' },
            {
              type: 'object',
              properties: {
                posted_balance: {
                  type: 'string',
                  description: 'Money that has fully settled in the account. For DEBIT_NORMAL accounts: posted debits - posted credits. For CREDIT_NORMAL accounts: posted credits - posted debits.',
                  example: '1250.00'
                },
                pending_balance: {
                  type: 'string',
                  description: 'Includes money expected to settle in/out plus settled money. For DEBIT_NORMAL: pending debits - pending credits. For CREDIT_NORMAL: pending credits - pending debits.',
                  example: '1500.00'
                },
                available_balance: {
                  type: 'string',
                  description: 'Money available to be sent out. For DEBIT_NORMAL: posted debits - pending credits. For CREDIT_NORMAL: posted credits - pending debits.',
                  example: '1000.00'
                }
              }
            }
          ]
        },
        AccountTypeEnum: {
          type: 'string',
          enum: ['DEBIT_NORMAL', 'CREDIT_NORMAL'],
          description: 'Type of the account. DEBIT_NORMAL for assets/expenses, CREDIT_NORMAL for liabilities/revenue/equity.',
          example: 'DEBIT_NORMAL'
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'An error occurred.'
            }
          }
        },
        ReconRule: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxmgmefg000208l3h4j5k6l7' },
            account_one_id: { type: 'string', example: 'clxmgm62n000008l3g1k0h2j7' },
            account_two_id: { type: 'string', example: 'clxmgmabc000108l3b2c1d4e5' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        ReconRuleWithAccounts: {
          allOf: [
            { $ref: '#/components/schemas/ReconRule' },
            {
              type: 'object',
              properties: {
                accountOne: {
                  type: 'object',
                  properties: {
                    account_id: { type: 'string' },
                    account_name: { type: 'string' },
                    merchant_id: { type: 'string' }
                  }
                },
                accountTwo: {
                  type: 'object',
                  properties: {
                    account_id: { type: 'string' },
                    account_name: { type: 'string' },
                    merchant_id: { type: 'string' }
                  }
                }
              }
            }
          ]
        },
        EntryStatusEnum: {
          type: 'string',
          enum: ['EXPECTED', 'POSTED', 'ARCHIVED'],
          description: 'Status of a ledger entry.',
          example: 'POSTED'
        },
        TransactionStatusEnum: {
          type: 'string',
          enum: ['EXPECTED', 'POSTED', 'MISMATCH', 'ARCHIVED'],
          description: 'Status of a financial transaction.',
          example: 'POSTED'
        },
        Transaction: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', description: 'Unique ID of the transaction version.', example: 'clxmgmefg000208l3h4j5k6l7' },
            logical_transaction_id: { type: 'string', description: 'Common ID for all versions of this logical transaction.', example: 'clxmgmefg000208l3h4j5k6l8' },
            version: { type: 'integer', description: 'Version number of this transaction.', example: 1 },
            merchant_id: { type: 'string', description: 'Merchant this transaction belongs to.' },
            status: { $ref: '#/components/schemas/TransactionStatusEnum' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            discarded_at: { type: 'string', format: 'date-time', nullable: true },
            metadata: { type: 'object', nullable: true },
            entries: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Entry'
              },
              description: 'List of entries part of this transaction.'
            }
          }
        },
        Entry: {
          type: 'object',
          properties: {
            entry_id: { type: 'string', description: 'Unique ID of the ledger entry.', example: 'clxmgmefg000208l3h4j5k6l7' },
            account_id: { type: 'string', description: 'Associated account ID.' },
            transaction_id: { type: 'string', nullable: true, description: 'Associated transaction ID (if any).' },
            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },
            amount: { type: 'number', format: 'decimal', description: 'Monetary amount.' },
            currency: { type: 'string', description: '3-letter currency code.' },
            status: { $ref: '#/components/schemas/EntryStatusEnum' },
            effective_date: { type: 'string', format: 'date-time', description: 'Effective date of the entry.' },
            metadata: { type: 'object', nullable: true, description: 'Optional JSON metadata.' },
            discarded_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp if entry is archived and effectively discarded.' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        StagingEntryStatusEnum: {
          type: 'string',
          enum: ['NEEDS_MANUAL_REVIEW', 'PROCESSED', 'PENDING', 'ARCHIVED'], // Added PENDING, ARCHIVED
          description: 'Status of a staging entry.'
        },
        EntryTypeEnum: {
          type: 'string',
          enum: ['DEBIT', 'CREDIT'],
          description: 'Type of financial entry.'
        },
        StagingEntryProcessingModeEnum: { // Added for StagingEntryInput
            type: 'string',
            enum: ['CONFIRMATION', 'TRANSACTION'],
            description: 'Processing mode for the staging entry.'
        },
        StagingEntryInput: {
          type: 'object',
          required: ['entry_type', 'amount', 'currency', 'effective_date', 'processing_mode'], // account_id is from path
          properties: {
            // account_id: { type: 'string', description: 'Associated account ID.' }, // From path
            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },
            amount: { type: 'number', format: 'decimal', description: 'Monetary amount.' },
            currency: { type: 'string', description: '3-letter currency code.' },
            effective_date: { type: 'string', format: 'date-time', description: 'Effective date of the entry.' },
            processing_mode: { $ref: '#/components/schemas/StagingEntryProcessingModeEnum'},
            metadata: { type: 'object', nullable: true, description: 'Optional JSON metadata.' },
            discarded_at: { type: 'string', format: 'date-time', nullable: true, description: 'Timestamp if entry is discarded.' }
          }
        },
        StagingEntry: {
          type: 'object',
          properties: {
            staging_entry_id: { type: 'string', description: 'Unique ID of the staging entry.' },
            account_id: { type: 'string' },
            entry_type: { $ref: '#/components/schemas/EntryTypeEnum' },
            amount: { type: 'number', format: 'decimal' },
            currency: { type: 'string' },
            status: { $ref: '#/components/schemas/StagingEntryStatusEnum' },
            processing_mode: { $ref: '#/components/schemas/StagingEntryProcessingModeEnum'},
            effective_date: { type: 'string', format: 'date-time' },
            metadata: { type: 'object', nullable: true },
            discarded_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
         HealthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Server is healthy and database is connected.'
            },
            database: {
              type: 'string',
              example: 'Connected'
            }
          }
        }
      }
    }
  },
  apis: [
    './src/server/routes/**/*.ts',
    './src/server/api_models/**/*.ts'
  ], // Include both routes and API models
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

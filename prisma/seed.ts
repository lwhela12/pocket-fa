import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create test user
  const hashedPassword = await argon2.hash('test123');
  const user = await prisma.user.upsert({
    where: { email: 'test@pocketfa.com' },
    update: {},
    create: {
      email: 'test@pocketfa.com',
      password: hashedPassword,
      mfaEnabled: false,
    },
  });

  console.log('✅ Created test user:', user.email);

  // Create profile
  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      age: 35,
      retirementAge: 65,
      riskTolerance: 'Moderate',
      inflationRate: 3.0,
      investmentReturn: 7.0,
      savingsRate: 20.0,
    },
  });

  console.log('✅ Created profile for age', profile.age);

  // Create Assets
  const assets = await Promise.all([
    // 401(k) - $120,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Investment',
        subtype: '401(k)',
        name: 'Company 401(k)',
        balance: 120000,
        growthRate: 8.0,
        annualContribution: 22500, // Max contribution
        assetClass: 'Stocks',
      },
    }),
    // Traditional IRA - $60,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Investment',
        subtype: 'Traditional IRA',
        name: 'Vanguard IRA',
        balance: 60000,
        growthRate: 7.5,
        annualContribution: 7000, // Max contribution
        assetClass: 'ETFs',
      },
    }),
    // High-Yield Savings - $20,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Cash',
        subtype: 'Savings',
        name: 'High-Yield Savings Account',
        balance: 20000,
        interestRate: 4.5,
        annualContribution: 0,
        assetClass: 'Cash',
      },
    }),
    // Checking Account - $8,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Cash',
        subtype: 'Checking',
        name: 'Primary Checking',
        balance: 8000,
        interestRate: 0.5,
        annualContribution: 0,
        assetClass: 'Cash',
      },
    }),
    // Primary Residence - $500,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Lifestyle',
        subtype: 'Primary Residence',
        name: 'Home (Estimated Value)',
        balance: 500000,
        interestRate: null,
        annualContribution: null,
        growthRate: null,
        assetClass: null,
      },
    }),
    // Vehicle - $35,000
    prisma.asset.create({
      data: {
        userId: user.id,
        type: 'Lifestyle',
        subtype: 'Vehicle',
        name: '2022 Toyota Camry',
        balance: 35000,
        interestRate: null,
        annualContribution: null,
        growthRate: null,
        assetClass: null,
      },
    }),
  ]);

  console.log('✅ Created', assets.length, 'assets');

  // Create Debts
  const debts = await Promise.all([
    // Mortgage - $450,000 remaining on $500k house
    prisma.debt.create({
      data: {
        userId: user.id,
        type: 'Mortgage',
        lender: 'Wells Fargo',
        balance: 450000,
        interestRate: 3.5,
        monthlyPayment: 2500,
        termLength: 300, // 25 years remaining (300 months)
      },
    }),
    // Car Loan - $25,000
    prisma.debt.create({
      data: {
        userId: user.id,
        type: 'Auto Loan',
        lender: 'Toyota Financial',
        balance: 25000,
        interestRate: 4.2,
        monthlyPayment: 550,
        termLength: 48, // 4 years
      },
    }),
    // Credit Card - $3,500 (carried balance)
    prisma.debt.create({
      data: {
        userId: user.id,
        type: 'Credit Card',
        lender: 'Chase Sapphire',
        balance: 3500,
        interestRate: 18.99,
        monthlyPayment: 200,
        termLength: null, // Revolving
      },
    }),
  ]);

  console.log('✅ Created', debts.length, 'debts');

  // Create Expense Record for current month
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const expenseRecord = await prisma.expenseRecord.upsert({
    where: {
      userId_month: {
        userId: user.id,
        month: currentMonth,
      }
    },
    update: {},
    create: {
      userId: user.id,
      month: currentMonth,
      isDetailed: true,
      totalMonthly: 8350,
      housing: 3200, // Mortgage + property tax + insurance
      utilities: 450, // Electric, water, gas, internet
      groceries: 800,
      dining: 600,
      transport: 800, // Car payment + gas + insurance
      healthcare: 500, // Premiums + copays
      entertainment: 400,
      miscellaneous: 600,
    },
  });

  console.log('✅ Created expense record for', currentMonth.toLocaleDateString());

  // Create individual expense items
  const expenses = await Promise.all([
    // Housing expenses
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Mortgage Payment',
        amount: 2500,
        category: 'Housing',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'Wells Fargo',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Property Tax',
        amount: 500,
        category: 'Housing',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'County Tax Collector',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Home Insurance',
        amount: 200,
        category: 'Housing',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'State Farm',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    // Utilities
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Electric Bill',
        amount: 180,
        category: 'Utilities',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'PG&E',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Internet & Cable',
        amount: 120,
        category: 'Utilities',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'Comcast',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    // Groceries
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Weekly Grocery Shopping',
        amount: 200,
        category: 'Groceries',
        frequency: 'weekly',
        date: new Date(),
        merchant: 'Whole Foods',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    // Dining
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Restaurant Meals',
        amount: 150,
        category: 'Dining',
        frequency: 'weekly',
        date: new Date(),
        merchant: 'Various',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    // Transport
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Car Payment',
        amount: 550,
        category: 'Transport',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'Toyota Financial',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Gas',
        amount: 60,
        category: 'Transport',
        frequency: 'weekly',
        date: new Date(),
        merchant: 'Shell',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    // Entertainment
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Netflix',
        amount: 15.99,
        category: 'Entertainment',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'Netflix',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Spotify Premium',
        amount: 10.99,
        category: 'Entertainment',
        frequency: 'monthly',
        date: new Date(),
        merchant: 'Spotify',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
    prisma.expense.create({
      data: {
        userId: user.id,
        expenseRecordId: expenseRecord.id,
        description: 'Gym Membership',
        amount: 75,
        category: 'Healthcare',
        frequency: 'monthly',
        date: new Date(),
        merchant: '24 Hour Fitness',
        isRecurring: true,
        sourceType: 'manual',
      },
    }),
  ]);

  console.log('✅ Created', expenses.length, 'individual expenses');

  // Create Insurance Policies
  const insurance = await Promise.all([
    prisma.insurancePolicy.create({
      data: {
        userId: user.id,
        type: 'Life',
        coverage: 1000000, // $1M life insurance
        isEmployerProvided: false,
      },
    }),
    prisma.insurancePolicy.create({
      data: {
        userId: user.id,
        type: 'Disability',
        coverage: 100000, // $100k/year disability
        isEmployerProvided: true,
      },
    }),
  ]);

  console.log('✅ Created', insurance.length, 'insurance policies');

  // Create Financial Goals
  const goals = await Promise.all([
    // Retirement Goal
    prisma.financialGoal.create({
      data: {
        userId: user.id,
        name: 'Retirement Savings',
        targetAmount: 2500000, // $2.5M retirement goal
        currentAmount: 200000, // Current savings
        targetDate: new Date('2055-12-31'), // Age 65
        isActive: true,
        priority: 1,
      },
    }),
    // Emergency Fund
    prisma.financialGoal.create({
      data: {
        userId: user.id,
        name: 'Emergency Fund',
        targetAmount: 50000, // 6 months expenses
        currentAmount: 20000, // Current savings account
        targetDate: new Date('2026-12-31'),
        isActive: true,
        priority: 2,
      },
    }),
    // Vacation Fund
    prisma.financialGoal.create({
      data: {
        userId: user.id,
        name: 'Europe Vacation',
        targetAmount: 15000,
        currentAmount: 3000,
        targetDate: new Date('2026-06-30'),
        isActive: true,
        priority: 3,
      },
    }),
    // Pay Off Credit Card
    prisma.financialGoal.create({
      data: {
        userId: user.id,
        name: 'Pay Off Credit Card Debt',
        targetAmount: 3500,
        currentAmount: 0,
        targetDate: new Date('2025-12-31'),
        isActive: true,
        priority: 1,
      },
    }),
  ]);

  console.log('✅ Created', goals.length, 'financial goals');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Account Credentials:');
  console.log('   Email: test@pocketfa.com');
  console.log('   Password: test123');
  console.log('\n💰 Financial Summary:');
  console.log('   Total Assets: $743,000');
  console.log('     - Investment: $180,000 (401k + IRA)');
  console.log('     - Cash: $28,000 (Savings + Checking)');
  console.log('     - Lifestyle: $535,000 (Home + Car)');
  console.log('   Total Debts: $478,500');
  console.log('   Net Worth: $264,500');
  console.log('   Retirement Savings: $208,000 (excludes lifestyle assets)');
  console.log('   Monthly Income: ~$12,500');
  console.log('   Monthly Expenses: $8,350');
  console.log('   Monthly Savings: ~$4,150');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

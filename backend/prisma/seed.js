const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[INFO] Seeding database for Industrial ERP...');

  // 1. Seed Users (ADMIN and SALES)
  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', passwordSalt);
  const salesPasswordHash = await bcrypt.hash('SalesPassword123!', passwordSalt);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@industrial-erp.com' },
    update: {},
    create: {
      email: 'admin@industrial-erp.com',
      password: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@industrial-erp.com' },
    update: {},
    create: {
      email: 'sales@industrial-erp.com',
      password: salesPasswordHash,
      name: 'Sales Representative',
      role: 'SALES',
    },
  });

  console.log(`[INFO] Seeded Users: ADMIN (${adminUser.email}), SALES (${salesUser.email})`);

  // 2. Seed 6 Realistic Industrial Products with Inventory
  const productsData = [
    {
      productCode: 'IND-MOT-001',
      productName: 'Three-Phase Induction Motor 5HP 1440RPM',
      category: 'Heavy Motors',
      unit: 'Units',
      basePrice: 18500.0,
      inventory: { physicalQuantity: 100, reservedQuantity: 20 }, // Available: 80
    },
    {
      productCode: 'IND-PMP-002',
      productName: 'Centrifugal Industrial Water Pump 3-Inch',
      category: 'Fluid Handling',
      unit: 'Units',
      basePrice: 24200.0,
      inventory: { physicalQuantity: 50, reservedQuantity: 10 }, // Available: 40
    },
    {
      productCode: 'IND-VLV-003',
      productName: 'Cast Steel Gate Valve 50mm PN16',
      category: 'Valves & Fittings',
      unit: 'Pieces',
      basePrice: 4800.0,
      inventory: { physicalQuantity: 200, reservedQuantity: 50 }, // Available: 150
    },
    {
      productCode: 'IND-CON-004',
      productName: 'High-Torque Roller Chain Conveyor 10m',
      category: 'Material Handling',
      unit: 'Sets',
      basePrice: 115000.0,
      inventory: { physicalQuantity: 15, reservedQuantity: 3 }, // Available: 12
    },
    {
      productCode: 'IND-HYD-005',
      productName: 'High-Pressure Hydraulic Cylinder 200 Bar',
      category: 'Hydraulics',
      unit: 'Units',
      basePrice: 32000.0,
      inventory: { physicalQuantity: 75, reservedQuantity: 15 }, // Available: 60
    },
    {
      productCode: 'IND-PAN-006',
      productName: 'Automated Industrial PLC Control Panel',
      category: 'Automation & Electrical',
      unit: 'Units',
      basePrice: 68000.0,
      inventory: { physicalQuantity: 30, reservedQuantity: 0 }, // Available: 30
    },
  ];

  for (const item of productsData) {
    const { inventory, ...productFields } = item;
    const product = await prisma.product.upsert({
      where: { productCode: productFields.productCode },
      update: {
        productName: productFields.productName,
        category: productFields.category,
        unit: productFields.unit,
        basePrice: productFields.basePrice,
      },
      create: productFields,
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        physicalQuantity: inventory.physicalQuantity,
        reservedQuantity: inventory.reservedQuantity,
      },
      create: {
        productId: product.id,
        physicalQuantity: inventory.physicalQuantity,
        reservedQuantity: inventory.reservedQuantity,
      },
    });
  }

  console.log(`[INFO] Seeded ${productsData.length} industrial products with initial physical and reserved inventory.`);

  // 3. Seed Realistic Industrial Customers
  const customerA = await prisma.customer.upsert({
    where: { email: 'rajesh@apexheavy.com' },
    update: {},
    create: {
      companyName: 'Apex Heavy Engineering Ltd',
      contactPerson: 'Rajesh Verma',
      mobile: '+91 98765 43210',
      email: 'rajesh@apexheavy.com',
      city: 'Mumbai',
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { email: 'priya@bharatinfra.com' },
    update: {},
    create: {
      companyName: 'Bharat Infra Dynamics Pvt Ltd',
      contactPerson: 'Priya Sharma',
      mobile: '+91 98111 22334',
      email: 'priya@bharatinfra.com',
      city: 'Pune',
    },
  });

  console.log(`[INFO] Seeded initial corporate customers: ${customerA.companyName}, ${customerB.companyName}`);
  console.log('[INFO] Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[ERROR] Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

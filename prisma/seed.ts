import { PrismaClient, ProductType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB Seed...');

  // Clean the database (truncate happened via migrations, but just to be safe)
  console.log('Cleaning up existing data...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.profile.deleteMany({});

  console.log('Seeding Profiles...');
  // Create an Admin Profile
  const admin = await prisma.profile.create({
    data: {
      id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      email: 'admin@divyafal.com',
      fullName: 'Divyafal Admin',
      phone: '+919876543210',
      role: UserRole.ADMIN,
      addresses: {
        create: {
          fullName: 'Divyafal Admin',
          phone: '+919876543210',
          street: '123 Admin Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          isDefault: true,
        },
      },
    },
  });

  console.log('Seeding Products & Variants...');
  const mockProducts = [
    {
      name: 'Royal Blue Silk Saree',
      price: 15999.0,
      sale: true,
      salePrice: 12999.0,
      specifications: 'Pure Kanchivaram Silk Saree with heavy Zari work.',
      category: ProductType.SAREE,
      photos: ['/mostrec/saree1.jpg'],
    },
    {
      name: 'Ruby Red Bridal Lehenga',
      price: 85000.0,
      sale: false,
      specifications: 'Intricate zardozi embroidery on velvet.',
      category: ProductType.LEHENGA,
      photos: ['/mostrec/lehenga1.jpg'],
    },
    {
      name: 'Pastel Floral Indo-Western',
      price: 22000.0,
      sale: false,
      specifications: 'Contemporary draped silhouette with floral motifs.',
      category: ProductType.INDO_WESTERN,
      photos: ['/mostrec/indowestern1.jpg'],
    },
    {
      name: 'Classic White Kurta Pant Set',
      price: 8500.0,
      sale: true,
      salePrice: 7500.0,
      specifications: 'Comfortable cotton-silk blend suited for daily wear.',
      category: ProductType.KURTA_PANT,
      photos: ['/mostrec/kurta1.jpg'],
    },
  ];

  for (const product of mockProducts) {
    await prisma.product.create({
      data: {
        name: product.name,
        price: product.price,
        sale: product.sale,
        salePrice: product.salePrice,
        specifications: product.specifications,
        category: product.category,
        photos: product.photos,
        variants: {
          create: [
            { size: 'S', stock: 10 },
            { size: 'M', stock: 15 },
            { size: 'L', stock: 5 },
            { size: 'Custom', stock: 99 }, // High stock for custom tailoring
          ],
        },
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

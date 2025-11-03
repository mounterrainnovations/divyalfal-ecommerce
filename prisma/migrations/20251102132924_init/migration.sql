-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SAREE', 'INDO_WESTERN', 'LEHENGA', 'SUIT', 'KURTA_PANT', 'WESTERN', 'OTHER');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "photos" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "specifications" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

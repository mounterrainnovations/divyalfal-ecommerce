import { Product } from '@/components/ProductCard';

// Categories from Categories.tsx
export const categories = ['Sarees', 'Indo-Western', 'Lehengas', 'Suits', 'Kurta Pant', 'Western'];

export const mockProducts: Product[] = [
  // Sarees
  {
    id: 1,
    name: 'Royal Banarasi Silk Saree with Gold Zari Work',
    price: 45999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },
  {
    id: 2,
    name: 'Elegant Georgette Saree with Embroidered Border',
    price: 32999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },
  {
    id: 3,
    name: 'Traditional Bandhani Saree in Rich Maroon',
    price: 38999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },
  {
    id: 4,
    name: 'Designer Chiffon Saree with Floral Print',
    price: 27999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },
  {
    id: 5,
    name: 'Party Wear Saree with Sequence Work',
    price: 52999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },
  {
    id: 6,
    name: 'Casual Cotton Saree for Daily Wear',
    price: 12999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Sarees',
  },

  // Indo-Western
  {
    id: 7,
    name: 'Palazzo Suit Set with embroidered Kurta',
    price: 35999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Indo-Western',
  },
  {
    id: 8,
    name: 'Anarkali Gown with Dupatta',
    price: 44999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Indo-Western',
  },
  {
    id: 9,
    name: 'Crop Top and Skirt Set',
    price: 28999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Indo-Western',
  },
  {
    id: 10,
    name: 'Jacket Style Kurta Set',
    price: 41999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Indo-Western',
  },

  // Lehengas
  {
    id: 11,
    name: 'Royal Banarasi Lehenga Choli Set',
    price: 89999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Lehengas',
  },
  {
    id: 12,
    name: 'Bridal Lehenga with Heavy Embroidery',
    price: 149999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Lehengas',
  },
  {
    id: 13,
    name: 'Lightweight Georgette Lehenga',
    price: 58999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Lehengas',
  },
  {
    id: 14,
    name: 'Cocktail Lehenga with Mirror Work',
    price: 78999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Lehengas',
  },

  // Suits
  {
    id: 15,
    name: 'Cotton Anarkali Suit Set',
    price: 24999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Suits',
  },
  {
    id: 16,
    name: 'Silk Kurta with Palazzo Set',
    price: 35999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Suits',
  },
  {
    id: 17,
    name: 'Straight Cut Suit with Churidar',
    price: 32999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Suits',
  },
  {
    id: 18,
    name: 'Pakistani Suit with Heavy Work',
    price: 46999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Suits',
  },

  // Kurta Pant
  {
    id: 19,
    name: 'Designer Kurta with Straight Pants',
    price: 19999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Kurta Pant',
  },
  {
    id: 20,
    name: 'Printed Kurta with Palazzo',
    price: 22999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Kurta Pant',
  },
  {
    id: 21,
    name: 'Embroidered Kurta with Churidar',
    price: 26999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Kurta Pant',
  },
  {
    id: 22,
    name: 'Cotton Kurta with Sharara',
    price: 24999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Kurta Pant',
  },

  // Western
  {
    id: 23,
    name: 'Bodycon Dress with Belt',
    price: 18999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Western',
  },
  {
    id: 24,
    name: 'Off-Shoulder Top with Skirt Set',
    price: 25999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Western',
  },
  {
    id: 25,
    name: 'Maxi Dress with Print',
    price: 21999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Western',
  },
  {
    id: 26,
    name: 'Crop Top with High-Waist Jeans',
    price: 16999,
    image: '/mocks/mock_mostRecommended_common.jpg',
    category: 'Western',
  },
];

// Price filter options
export const priceRanges = [
  { label: 'Under ₹25,000', min: 0, max: 25000 },
  { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
  { label: '₹50,000 - ₹75,000', min: 50000, max: 75000 },
  { label: '₹75,000 - ₹1,00,000', min: 75000, max: 100000 },
  { label: 'Above ₹1,00,000', min: 100000, max: 200000 },
];

// Sort options
export const sortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

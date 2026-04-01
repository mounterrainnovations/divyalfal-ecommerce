import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

export interface CartItem {
  id: string; // Format: productId-size
  productId: string;
  product: Product;
  size: string;
  quantity: number;
  customMeasurements?: {
    bust?: string;
    waist?: string;
    hips?: string;
  };
}

export interface CheckoutAddress {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CartStore {
  items: CartItem[];
  address: CheckoutAddress | null;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setAddress: (address: CheckoutAddress) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      address: null,
      addItem: (item) =>
        set((state) => {
          const id = `${item.productId}-${item.size}`;
          const existingItemIndex = state.items.findIndex((i) => i.id === id);

          if (existingItemIndex > -1) {
            // Update quantity if already exists and size matches
            // Overwriting custom dimensions if it's the 'Custom' size might be needed,
            // but usually users won't add identical custom sizes twice differently.
            // Simplified logic: Just aggregate quantity.
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += item.quantity;
            
            if (item.size === 'Custom') {
                newItems[existingItemIndex].customMeasurements = item.customMeasurements;
            }
            
            return { items: newItems };
          }

          return { items: [...state.items, { ...item, id }] };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),
      clearCart: () => set({ items: [], address: null }),
      setAddress: (address) => set({ address }),
      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((total, item) => {
          const price =
            item.product.sale && item.product.salePrice
              ? item.product.salePrice
              : item.product.price;
          return total + price * item.quantity;
        }, 0),
    }),
    {
      name: 'divyafal-cart',
    }
  )
);

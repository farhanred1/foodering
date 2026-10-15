import React, { createContext, useContext, useState, useEffect } from 'react';
import { WooCartItem, WooCart, Product } from '../types/cafeteria';
import { CafeteriaAPI } from '../services/api';

interface CartContextType {
  cart: WooCart;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (key: string, productId: number) => Promise<void>;
  updateQuantity: (key: string, productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<WooCart>({
    items: [],
    items_count: 0,
    total_price: 0,
    total_price_formatted: '$0.00',
    currency_symbol: '$'
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshCart = async () => {
    try {
      const data = await CafeteriaAPI.getCart();
      setCart(data);
    } catch (e) {
      console.error('Failed to refresh cart', e);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (product: Product, quantity: number = 1) => {
    setLoading(true);
    try {
      const updated = await CafeteriaAPI.addToCart(product, quantity);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (key: string, productId: number) => {
    setLoading(true);
    try {
      const updated = await CafeteriaAPI.removeFromCart(key, productId);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (key: string, productId: number, quantity: number) => {
    setLoading(true);
    try {
      const updated = await CafeteriaAPI.updateQuantity(key, productId, quantity);
      setCart(updated);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await CafeteriaAPI.clearCart();
      await refreshCart();
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        isCartOpen,
        setIsCartOpen,
        loading
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

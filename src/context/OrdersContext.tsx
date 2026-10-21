import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserOrder, WalletTransaction } from '../types/cafeteria';
import { CafeteriaAPI } from '../services/api';
import { useAuth } from './AuthContext';

interface OrdersContextType {
  orders: UserOrder[];
  addOrder: (order: UserOrder) => void;
  clearOrders: () => void;
  refreshOrders: () => void;
  isOrdersOpen: boolean;
  setIsOrdersOpen: (open: boolean) => void;
  activeTab: 'orders' | 'wallet';
  setActiveTab: (tab: 'orders' | 'wallet') => void;
  walletBalance: number;
  walletTransactions: WalletTransaction[];
  deductWallet: (amount: number, details?: string) => void;
  openWithTab: (tab: 'orders' | 'wallet') => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<UserOrder[]>(() => CafeteriaAPI.getAuthenticUserOrders());
  const [walletBalance, setWalletBalance] = useState<number>(() => CafeteriaAPI.getWalletBalance());
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>(() => CafeteriaAPI.getWalletTransactions());
  
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'wallet'>('orders');

  // Synchronize with active user login/logout
  const refreshOrders = async () => {
    if (user) {
      setOrders(CafeteriaAPI.getAuthenticUserOrders());
      setWalletBalance(CafeteriaAPI.getWalletBalance());
      setWalletTransactions(CafeteriaAPI.getWalletTransactions());

      try {
        const fresh = await CafeteriaAPI.fetchUserDataFromServer(user.username);
        if (fresh) {
          setOrders(CafeteriaAPI.getAuthenticUserOrders());
          setWalletBalance(CafeteriaAPI.getWalletBalance());
        }
      } catch {}
    } else {
      setOrders([]);
      setWalletBalance(0);
      setWalletTransactions([]);
      setIsOrdersOpen(false);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [user]);

  // When wallet modal is opened, always refresh immediately
  useEffect(() => {
    if (isOrdersOpen && user) {
      refreshOrders();
    }
  }, [isOrdersOpen, user]);

  useEffect(() => {
    if (!user) return;
    try {
      sessionStorage.setItem('ssip_session_orders', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save order history', e);
    }
  }, [orders, user]);

  const addOrder = (newOrder: UserOrder) => {
    setOrders(prev => [newOrder, ...prev]);

    // Deduct from wallet balance
    if (newOrder.total > 0) {
      const newBal = CafeteriaAPI.deductWallet(
        newOrder.total,
        `Canteen Order #${newOrder.orderNumber} (${newOrder.items.map(i => i.name).join(', ')})`
      );
      setWalletBalance(newBal);
      setWalletTransactions(CafeteriaAPI.getWalletTransactions());
    }
  };

  const deductWallet = (amount: number, details?: string) => {
    const newBal = CafeteriaAPI.deductWallet(amount, details);
    setWalletBalance(newBal);
    setWalletTransactions(CafeteriaAPI.getWalletTransactions());
  };

  const clearOrders = () => {
    setOrders([]);
    sessionStorage.removeItem('ssip_session_orders');
  };

  const openWithTab = (tab: 'orders' | 'wallet') => {
    setActiveTab(tab);
    setIsOrdersOpen(true);
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        addOrder,
        clearOrders,
        refreshOrders,
        isOrdersOpen,
        setIsOrdersOpen,
        activeTab,
        setActiveTab,
        walletBalance,
        walletTransactions,
        deductWallet,
        openWithTab
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

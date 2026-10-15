import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { OrdersProvider } from './context/OrdersContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <OrdersProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </OrdersProvider>
    </AuthProvider>
  </React.StrictMode>
);

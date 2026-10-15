import React, { useState } from 'react';
import { Product } from '../types/cafeteria';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Check, UtensilsCrossed, Soup, Utensils, Coffee } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { cart, addToCart, updateQuantity } = useCart();
  const [imageError, setImageError] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);

  const cartItem = cart.items.find(i => i.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = async () => {
    setAddedAnim(true);
    await addToCart(product, 1);
    setTimeout(() => setAddedAnim(false), 800);
  };

  const handleMinus = async () => {
    if (cartItem) {
      await updateQuantity(cartItem.key, product.id, quantity - 1);
    }
  };

  const handlePlus = async () => {
    if (cartItem) {
      await updateQuantity(cartItem.key, product.id, quantity + 1);
    } else {
      await handleAdd();
    }
  };

  // Cuisine theme styles and icons for the 4 shops
  const getShopVisuals = (shopId: string) => {
    switch (shopId) {
      case 'malay':
        return {
          bgGradient: 'from-emerald-700 via-emerald-600 to-teal-500',
          badgeBg: 'bg-emerald-700',
          badgeText: 'text-emerald-100',
          icon: <UtensilsCrossed className="w-10 h-10 text-emerald-100" />,
          label: 'Malay Stall'
        };
      case 'chinese':
        return {
          bgGradient: 'from-rose-700 via-rose-600 to-orange-500',
          badgeBg: 'bg-rose-700',
          badgeText: 'text-rose-100',
          icon: <Soup className="w-10 h-10 text-rose-100" />,
          label: 'Chinese Stall'
        };
      case 'international':
        return {
          bgGradient: 'from-indigo-700 via-indigo-600 to-blue-500',
          badgeBg: 'bg-indigo-700',
          badgeText: 'text-indigo-100',
          icon: <Utensils className="w-10 h-10 text-indigo-100" />,
          label: 'International Stall'
        };
      case 'drinks':
        return {
          bgGradient: 'from-sky-700 via-sky-600 to-cyan-500',
          badgeBg: 'bg-sky-700',
          badgeText: 'text-sky-100',
          icon: <Coffee className="w-10 h-10 text-sky-100" />,
          label: 'Drinks & Snacks'
        };
      default:
        return {
          bgGradient: 'from-slate-800 to-slate-700',
          badgeBg: 'bg-slate-800',
          badgeText: 'text-slate-100',
          icon: <Utensils className="w-10 h-10 text-slate-100" />,
          label: 'Cafeteria Stall'
        };
    }
  };

  const visuals = getShopVisuals(product.shopId);

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-row sm:flex-col overflow-hidden items-center sm:items-stretch p-2 sm:p-0 gap-2.5 sm:gap-0">
      
      {/* Product Image OR Shop Cuisine Identifier Banner */}
      <div className="relative w-16 h-16 sm:w-full sm:aspect-[16/10] overflow-hidden bg-slate-100 rounded-lg sm:rounded-none shrink-0">
        {product.image && !imageError ? (
          <img
            src={product.image}
            alt={product.displayName}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          /* Vibrant Cuisine Identifier Card */
          <div className={`w-full h-full flex flex-col items-center justify-center p-1 sm:p-4 bg-gradient-to-tr ${visuals.bgGradient} text-white relative shadow-inner group-hover:brightness-105 transition-all`}>
            <div className="p-1.5 sm:p-3 bg-white/15 backdrop-blur-md rounded-lg sm:rounded-2xl shadow-sm mb-0 sm:mb-1.5 border border-white/20">
              {React.cloneElement(visuals.icon as React.ReactElement, { className: 'w-4 h-4 sm:w-10 sm:h-10 text-white' })}
            </div>
            <span className="text-[9px] sm:text-xs font-bold tracking-tight text-white/95 hidden sm:block">
              {product.shopName}
            </span>
            <span className="text-[8px] sm:text-[10px] text-white/80 font-medium hidden sm:block">
              {product.shopCuisine}
            </span>
          </div>
        )}

        {/* Shop Badge Pill (desktop only) */}
        <span className={`hidden sm:inline-block absolute top-2.5 left-2.5 ${visuals.badgeBg} ${visuals.badgeText} backdrop-blur-md text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm max-w-[85%] truncate`}>
          {visuals.label}
        </span>

        {/* Sold out overlay */}
        {!product.is_in_stock && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-red-500 text-white text-[9px] sm:text-xs font-bold px-1.5 sm:px-3 py-0.5 sm:py-1 rounded-full uppercase tracking-wider shadow">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-0 sm:p-4 flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          <div className="flex items-center gap-1.5 sm:hidden mb-0.5">
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${visuals.badgeBg} ${visuals.badgeText}`}>
              {visuals.label}
            </span>
          </div>

          <h3 className="font-bold sm:font-extrabold text-slate-900 text-xs sm:text-base leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors uppercase">
            {product.name}
          </h3>

          {product.description && (
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-2 leading-relaxed hidden xs:block">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Add to Cart Action */}
        <div className="mt-1 sm:mt-4 pt-1 sm:pt-3 border-t-0 sm:border-t border-slate-100 flex items-center justify-between gap-1 sm:gap-2">
          <div>
            <span className="text-[9px] sm:text-xs text-slate-400 font-medium hidden sm:block">Price</span>
            <div className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
              ${product.price.toFixed(2)}
            </div>
          </div>

          <div>
            {quantity > 0 ? (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full border border-slate-200">
                <button
                  onClick={handleMinus}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-xs active:scale-95"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="w-4 sm:w-6 text-center text-[11px] sm:text-xs font-extrabold text-slate-800">
                  {quantity}
                </span>
                <button
                  onClick={handlePlus}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-all shadow-xs active:scale-95"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                disabled={!product.is_in_stock}
                onClick={handleAdd}
                className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 ${
                  product.is_in_stock
                    ? addedAnim
                      ? 'bg-emerald-600 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white hover:shadow-brand-500/25'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {addedAnim ? (
                  <>
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

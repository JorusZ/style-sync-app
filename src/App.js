import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    ShoppingCart, Heart, Search, X, ChevronDown, ChevronUp, Filter, User, ChevronLeft, Loader2, LogOut, Package, MapPin, CheckCircle, Sun, Moon, Zap 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, onSnapshot 
} from 'firebase/firestore';

// --- Global Firebase Configuration Variables (MUST BE USED) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Static Product Data (Mocking a database/API response) ---
const mockProducts = [
  { id: 1, name: "Essential Tee", category: "Tops", color: "Black", price: 29.99, size: "S, M, L", image: "https://placehold.co/400x500/000000/FFFFFF?text=Essential+Tee", isNew: true, rating: 4.5 },
  { id: 2, name: "High-Rise Denim", category: "Bottoms", color: "Blue", price: 79.50, size: "26, 28, 30, 32", image: "https://placehold.co/400x500/556B2F/FFFFFF?text=High-Rise+Denim", isNew: false, rating: 4.8 },
  { id: 3, name: "Knit Sweater", category: "Outerwear", color: "Beige", price: 119.00, size: "S, M, L, XL", image: "https://placehold.co/400x500/A0522D/FFFFFF?text=Knit+Sweater", isNew: false, rating: 4.2 },
  { id: 4, name: "Flowy Summer Dress", category: "Dresses", color: "Red", price: 89.99, size: "XS, S, M", image: "https://placehold.co/400x500/8B0000/FFFFFF?text=Summer+Dress", isNew: true, rating: 4.9 },
  { id: 5, name: "Casual Sneakers", category: "Shoes", color: "White", price: 59.99, size: "7, 8, 9, 10", image: "https://placehold.co/400x500/D3D3D3/000000?text=Sneakers", isNew: false, rating: 4.1 },
  { id: 6, name: "Tailored Blazer", category: "Outerwear", color: "Gray", price: 149.99, size: "M, L, XL", image: "https://placehold.co/400x500/808080/FFFFFF?text=Tailored+Blazer", isNew: false, rating: 4.7 },
  { id: 7, name: "Jogger Pants", category: "Bottoms", color: "Grey", price: 49.99, size: "M, L", image: "https://placehold.co/400x500/696969/FFFFFF?text=Jogger+Pants", isNew: false, rating: 4.4 },
  { id: 8, name: "Polo Shirt", category: "Tops", color: "Navy", price: 35.00, size: "S, L", image: "https://placehold.co/400x500/000080/FFFFFF?text=Polo+Shirt", isNew: true, rating: 4.6 },
];

// Mock Order History Data (Static for simplicity in this component)
const mockOrders = [
    { id: '1001', date: '2025-10-20', total: 109.49, status: 'Delivered', items: 2, products: [{ name: 'Essential Tee', qty: 1, price: 29.99 }, { name: 'Jogger Pants', qty: 1, price: 49.99 }] },
    { id: '1002', date: '2025-11-05', total: 201.29, status: 'Shipped', items: 1, products: [{ name: 'Tailored Blazer', qty: 1, price: 149.99 }] },
];

const categories = ["All", "Tops", "Bottoms", "Outerwear", "Dresses", "Shoes"];
const colors = ["All", "Black", "Blue", "Beige", "Red", "White", "Gray", "Grey", "Navy"];
const sortingOptions = ["Newest", "Price: Low to High", "Price: High to Low", "Rating"];

// --- Toast Notification Component ---

const Toast = ({ message, type, onClose }) => {
    const baseClasses = "fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white font-medium z-[100] transition-opacity duration-300";
    let typeClasses = "";

    switch (type) {
        case 'success':
            typeClasses = "bg-green-600";
            break;
        case 'error':
            typeClasses = "bg-red-600";
            break;
        case 'info':
        default:
            typeClasses = "bg-gray-800";
            break;
    }

    useEffect(() => {
        const timer = setTimeout(onClose, 3000); // Auto-close after 3 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`${baseClasses} ${typeClasses} flex items-center`}>
            {message}
            <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20">
                <X size={16} />
            </button>
        </div>
    );
};

// --- Theme Utility ---

// Helper to determine primary accent class based on theme state
const getAccentClass = (theme, type) => {
    const color = theme.accentColor;
    const isDark = theme.mode === 'dark';

    switch (type) {
        case 'bg':
            // Examples: bg-pink-600, dark:bg-pink-500, bg-teal-600, dark:bg-teal-500
            if (color === 'pink') return isDark ? 'bg-pink-500 hover:bg-pink-600' : 'bg-pink-600 hover:bg-pink-700';
            if (color === 'blue') return isDark ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700';
            if (color === 'teal') return isDark ? 'bg-teal-500 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700';
            break;
        case 'text':
            // Examples: text-pink-600, dark:text-pink-400
            if (color === 'pink') return isDark ? 'text-pink-400 hover:text-pink-500' : 'text-pink-600 hover:text-pink-700';
            if (color === 'blue') return isDark ? 'text-blue-400 hover:text-blue-500' : 'text-blue-600 hover:text-blue-700';
            if (color === 'teal') return isDark ? 'text-teal-400 hover:text-teal-500' : 'text-teal-600 hover:text-teal-700';
            break;
        case 'border':
            // Examples: border-pink-600, dark:border-pink-500
            if (color === 'pink') return isDark ? 'border-pink-500' : 'border-pink-600';
            if (color === 'blue') return isDark ? 'border-blue-500' : 'border-blue-600';
            if (color === 'teal') return isDark ? 'border-teal-500' : 'border-teal-600';
            break;
        case 'fill':
            // Examples: fill-pink-500, dark:fill-pink-400
            if (color === 'pink') return isDark ? 'fill-pink-400' : 'fill-pink-500';
            if (color === 'blue') return isDark ? 'fill-blue-400' : 'fill-blue-500';
            if (color === 'teal') return isDark ? 'fill-teal-400' : 'fill-teal-500';
            break;
        default:
            return '';
    }
};


// --- New Views/Components ---

const OrderSuccessView = ({ onNavigateHome }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:p-10 max-w-xl mx-auto text-center mt-12">
            <CheckCircle size={80} className="mx-auto text-green-600 mb-6" />
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">Order Placed Successfully!</h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
                Thank you for your purchase. Your order confirmation and tracking details have been sent to your email.
            </p>
            <div className="space-y-3">
                <p className="text-sm text-gray-500">Order ID: **SS-{Date.now().toString().slice(-6)}**</p>
                <p className="text-sm text-gray-500">Expected Delivery: 3-5 Business Days</p>
            </div>
            <button
                onClick={onNavigateHome}
                className="w-full mt-10 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition duration-300 shadow-lg"
            >
                Continue Shopping
            </button>
        </div>
    );
};

const CheckoutView = ({ cart, onNavigateHome, onCheckoutSuccess }) => {
    const [checkoutStep, setCheckoutStep] = useState('shipping'); // 'shipping', 'payment', 'review'
    const [shippingInfo, setShippingInfo] = useState({ fullName: '', address: '', city: '', zip: '', country: 'US' });
    const [paymentInfo, setPaymentInfo] = useState({ cardNumber: '1234567812345678', expiry: '12/26', cvv: '123' });

    const SHIPPING_COST = 5.00;
    const TAX_RATE = 0.08;

    const subtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + SHIPPING_COST + tax;

    const handleShippingChange = (e) => {
        const { name, value } = e.target;
        setShippingInfo(prev => ({ ...prev, [name]: value }));
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        setPaymentInfo(prev => ({ ...prev, [name]: value }));
    };
    
    // Simple validation (can be expanded)
    const isShippingValid = shippingInfo.fullName && shippingInfo.address && shippingInfo.city && shippingInfo.zip;
    const isPaymentValid = paymentInfo.cardNumber.length >= 16 && paymentInfo.expiry.length === 5 && paymentInfo.cvv.length === 3;

    const handlePlaceOrder = () => {
        // Mocking the order placement process
        setTimeout(() => {
            onCheckoutSuccess();
        }, 500);
    };

    const inputClasses = "w-full p-3 border rounded-lg focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100";

    const renderShipping = () => (
        <div className='space-y-6'>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">1. Shipping Information</h2>
            <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('payment'); }} className="space-y-4">
                <input type="text" name="fullName" placeholder="Full Name" value={shippingInfo.fullName} onChange={handleShippingChange} className={inputClasses} required />
                <input type="text" name="address" placeholder="Street Address" value={shippingInfo.address} onChange={handleShippingChange} className={inputClasses} required />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="city" placeholder="City" value={shippingInfo.city} onChange={handleShippingChange} className={inputClasses} required />
                    <input type="text" name="zip" placeholder="Zip/Postal Code" value={shippingInfo.zip} onChange={handleShippingChange} className={inputClasses} required />
                </div>
                <button 
                    type="submit" 
                    disabled={!isShippingValid}
                    className="w-full py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition disabled:bg-gray-400"
                >
                    Continue to Payment
                </button>
            </form>
        </div>
    );

    const renderPayment = () => (
        <div className='space-y-6'>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">2. Payment Method (Mocked)</h2>
            <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('review'); }} className="space-y-4">
                <input type="text" name="cardNumber" placeholder="Card Number (16 digits)" value={paymentInfo.cardNumber} onChange={handlePaymentChange} className={inputClasses} maxLength="16" required />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="expiry" placeholder="MM/YY" value={paymentInfo.expiry} onChange={handlePaymentChange} className={inputClasses} maxLength="5" required />
                    <input type="text" name="cvv" placeholder="CVV" value={paymentInfo.cvv} onChange={handlePaymentChange} className={inputClasses} maxLength="3" required />
                </div>
                <div className="flex space-x-4">
                    <button 
                        type="button" 
                        onClick={() => setCheckoutStep('shipping')}
                        className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        Back to Shipping
                    </button>
                    <button 
                        type="submit" 
                        disabled={!isPaymentValid}
                        className="flex-1 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition disabled:bg-gray-400"
                    >
                        Review Order
                    </button>
                </div>
            </form>
        </div>
    );

    const renderReview = () => (
        <div className='space-y-8'>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">3. Review & Place Order</h2>
            
            {/* Shipping Summary */}
            <div className="p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <h3 className="font-semibold text-lg mb-2 flex items-center text-gray-900 dark:text-gray-100"><MapPin size={18} className="mr-2 text-pink-600" /> Ship To:</h3>
                <p className="text-gray-700 dark:text-gray-300">{shippingInfo.fullName}</p>
                <p className="text-gray-600 dark:text-gray-400">{shippingInfo.address}</p>
                <p className="text-gray-600 dark:text-gray-400">{shippingInfo.city}, {shippingInfo.zip}, {shippingInfo.country}</p>
                <button onClick={() => setCheckoutStep('shipping')} className="mt-2 text-sm text-pink-600 hover:underline">Edit Shipping</button>
            </div>

            {/* Payment Summary */}
            <div className="p-4 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                <h3 className="font-semibold text-lg mb-2 flex items-center text-gray-900 dark:text-gray-100"><Package size={18} className="mr-2 text-pink-600" /> Payment:</h3>
                <p className="text-gray-700 dark:text-gray-300">Card ending in **{paymentInfo.cardNumber.slice(-4)}**</p>
                <p className="text-gray-600 dark:text-gray-400">Expires: {paymentInfo.expiry}</p>
                <button onClick={() => setCheckoutStep('payment')} className="mt-2 text-sm text-pink-600 hover:underline">Edit Payment</button>
            </div>

            {/* Order Items Summary (Collapsed view) */}
            <div className='border-t pt-4 dark:border-gray-700'>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">Items ({cart.length})</h3>
                <ul className='space-y-2 max-h-48 overflow-y-auto pr-2'>
                    {cart.map((item, index) => (
                        <li key={item.cartId || index} className='flex justify-between text-sm text-gray-700 dark:text-gray-300'>
                            <span>{item.name} ({item.selectedSize}) x {item.quantity}</span>
                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className='flex space-x-4'>
                <button 
                    type="button" 
                    onClick={() => setCheckoutStep('payment')}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                    Back
                </button>
                <button 
                    onClick={handlePlaceOrder}
                    className="flex-1 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-pink-600 transition shadow-lg"
                >
                    Place Order (Total: ${total.toFixed(2)})
                </button>
            </div>
        </div>
    );

    const renderStepContent = () => {
        switch (checkoutStep) {
            case 'shipping':
                return renderShipping();
            case 'payment':
                return renderPayment();
            case 'review':
                return renderReview();
            default:
                return <p>Error: Invalid checkout step.</p>;
        }
    };
    
    // Step indicator bar
    const StepIndicator = ({ stepName, stepNumber, currentStep }) => {
        const isActive = currentStep === stepName;
        const isComplete = (stepNumber === 1 && ['payment', 'review'].includes(currentStep)) || (stepNumber === 2 && currentStep === 'review');
        const baseClasses = "flex items-center text-sm font-medium transition duration-300";
        const activeClasses = "text-pink-600";
        const completedClasses = "text-gray-900 dark:text-gray-100";
        const pendingClasses = "text-gray-400";
        
        return (
            <div className={`${baseClasses} ${isActive ? activeClasses : isComplete ? completedClasses : pendingClasses}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-2 border-2 ${isActive ? 'border-pink-600 bg-pink-50' : isComplete ? 'border-pink-600 bg-pink-600 text-white' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {isComplete ? <CheckCircle size={16} /> : stepNumber}
                </div>
                <span className="hidden sm:inline">{stepName.charAt(0).toUpperCase() + stepName.slice(1)}</span>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:p-10 max-w-4xl mx-auto">
             <button 
                onClick={onNavigateHome} 
                className="text-gray-600 dark:text-gray-400 hover:text-pink-600 flex items-center mb-8 text-sm font-medium transition duration-300"
            >
                <ChevronLeft size={20} className="mr-1" /> Cancel and Return to Home
            </button>
            
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">Secure Checkout</h1>

            {/* Step Indicator */}
            <div className="flex justify-between items-center mb-10 pb-4 border-b dark:border-gray-700">
                <StepIndicator stepName="shipping" stepNumber={1} currentStep={checkoutStep} />
                <div className={`h-0.5 w-1/4 transition-colors duration-300 ${['payment', 'review'].includes(checkoutStep) ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <StepIndicator stepName="payment" stepNumber={2} currentStep={checkoutStep} />
                <div className={`h-0.5 w-1/4 transition-colors duration-300 ${checkoutStep === 'review' ? 'bg-pink-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <StepIndicator stepName="review" stepNumber={3} currentStep={checkoutStep} />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Form Steps */}
                <div className="lg:w-3/5">
                    {renderStepContent()}
                </div>
                
                {/* Right Column: Order Summary */}
                <div className="lg:w-2/5 bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 h-fit">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h3>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-3">
                        <div className="flex justify-between"><span>Subtotal ({cart.length} items)</span><span>${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Shipping</span><span>${SHIPPING_COST.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Estimated Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-gray-100 pt-3">
                        <span>Order Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Shipping calculated for standard domestic delivery.</p>
                </div>
            </div>
        </div>
    );
};

const OrderHistoryView = ({ onBack, getAccentClass, theme }) => {
    const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600';

    const getStatusClass = (status) => {
        if (status === 'Delivered') return 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400';
        if (status === 'Shipped') return 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700/50 dark:text-gray-400';
    };

    return (
        <div className={`${cardBgClass} rounded-xl shadow-lg p-6 lg:p-10 max-w-4xl mx-auto`}>
            <button 
                onClick={onBack} 
                className={`${textSecondaryClass} hover:${getAccentClass(theme, 'text')} flex items-center mb-8 text-sm font-medium transition duration-300`}
            >
                <ChevronLeft size={20} className="mr-1" /> Back to Profile
            </button>

            <h1 className={`text-4xl font-extrabold ${textPrimaryClass} mb-8 flex items-center`}>
                <Package size={30} className={`mr-3 ${getAccentClass(theme, 'text')}`} /> My Orders
            </h1>

            {mockOrders.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-xl font-medium">No recent orders found.</p>
                    <p className="mt-2">Time to find your new favorite style!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {mockOrders.map(order => (
                        <div key={order.id} className={`${cardBgClass} p-5 rounded-xl shadow-md border`}>
                            <div className="flex justify-between items-start mb-3 border-b pb-3 dark:border-gray-600">
                                <div className="space-y-1">
                                    <h2 className={`font-bold text-xl ${textPrimaryClass}`}>Order #{order.id}</h2>
                                    <p className={`text-sm ${textSecondaryClass}`}>Placed on: {order.date}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
                                    {order.status}
                                </span>
                            </div>
                            
                            <div className='flex justify-between items-center'>
                                <p className={`font-semibold ${textPrimaryClass}`}>{order.items} {order.items > 1 ? 'items' : 'item'}</p>
                                <p className={`text-2xl font-bold ${getAccentClass(theme, 'text')}`}>${order.total.toFixed(2)}</p>
                            </div>

                            <button className={`mt-4 w-full py-2 border rounded-lg text-sm font-medium ${textSecondaryClass} hover:${getAccentClass(theme, 'text')} hover:border-${getAccentClass(theme, 'border')}`}>
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const WishlistView = ({ wishlist, onBack, addToCart, removeFromWishlist, onViewDetails, getAccentClass, theme }) => {
    const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white';
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const primaryTextClass = getAccentClass(theme, 'text');
    const primaryBgClass = getAccentClass(theme, 'bg');

    return (
        <div className={`${cardBgClass} rounded-xl shadow-lg p-6 lg:p-10`}>
            <button 
                onClick={onBack} 
                className={`${textSecondaryClass} hover:${primaryTextClass} flex items-center mb-6 text-sm font-medium transition duration-300`}
            >
                <ChevronLeft size={20} className="mr-1" /> Back to Profile
            </button>

            <h1 className={`text-4xl font-extrabold ${textPrimaryClass} mb-8 flex items-center`}>
                <Heart size={30} className={`mr-3 ${primaryTextClass}`} fill={getAccentClass(theme, 'fill')} /> My Wishlist ({wishlist.length})
            </h1>

            {wishlist.length === 0 ? (
                <div className={`text-center py-20 ${textSecondaryClass}`}>
                    <Heart size={48} className="mx-auto mb-4 text-gray-500" />
                    <p className="text-xl font-medium">Your wishlist is empty.</p>
                    <p className="mt-2">Save your favorite items here while you decide!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                    {wishlist.map(product => (
                        <div key={product.id} className={`${cardBgClass} rounded-xl shadow-lg overflow-hidden group border dark:border-gray-700`}>
                             <div className="relative overflow-hidden" onClick={() => onViewDetails(product)}>
                                <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-64 object-cover cursor-pointer transform group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500/1F2937/FFFFFF?text=Image+Missing"; }}
                                />
                                <button
                                    className={`absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-300`}
                                    aria-label="Remove from Wishlist"
                                    onClick={(e) => { e.stopPropagation(); removeFromWishlist(product.id); }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-4 flex flex-col items-center text-center">
                                <h3 className={`text-lg font-semibold ${textPrimaryClass} truncate w-full px-2`}>{product.name}</h3>
                                <p className={`text-xl font-bold ${primaryTextClass} mt-1`}>${product.price.toFixed(2)}</p>
                                <button
                                    onClick={() => addToCart(product, product.size.split(',')[0].trim(), 1)} // Quick add default size
                                    className={`mt-3 w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:${primaryBgClass} transition duration-300 flex items-center justify-center text-sm font-medium shadow-md`}
                                >
                                    <ShoppingCart size={18} className="mr-2" /> Add to Cart
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Filter Sidebar Component (FIXED: Was missing and caused ReferenceError) ---
const FilterSidebar = ({ filters, setFilters, isOpen, onClose }) => {
    const [localFilters, setLocalFilters] = useState(filters);
    
    // Sync local state when external filters change (e.g., reset from main view)
    useEffect(() => {
        if (!isOpen) {
            setLocalFilters(filters);
        }
    }, [filters, isOpen]);
    
    const handleFilterChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        setFilters(localFilters);
        onClose();
    };

    const handleReset = () => {
        const defaultFilters = {
            category: 'All',
            color: 'All',
            sort: 'Newest',
        };
        setLocalFilters(defaultFilters);
        setFilters(defaultFilters);
        onClose();
    };
    
    // Utility to map color names to Tailwind colors for display
    const getColorClass = (colorName) => {
        switch (colorName) {
            case 'Black': return 'bg-black text-white';
            case 'Blue': return 'bg-blue-600 text-white';
            case 'Beige': return 'bg-yellow-100 text-gray-800 border-yellow-200';
            case 'Red': return 'bg-red-600 text-white';
            case 'White': return 'bg-white text-gray-800 border-gray-300';
            case 'Gray':
            case 'Grey': return 'bg-gray-500 text-white';
            case 'Navy': return 'bg-blue-900 text-white';
            case 'All': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
        }
    };

    return (
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black transition-opacity ${isOpen ? 'opacity-50' : 'opacity-0'}`} onClick={onClose}></div>

            {/* Sidebar Content */}
            <div className="absolute right-0 top-0 bottom-0 w-full md:w-80 bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Filters</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-pink-600 transition p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    {/* Category Filter */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Category</h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => handleFilterChange('category', cat)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${
                                        localFilters.category === cat
                                            ? 'bg-pink-600 text-white shadow-md'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Filter */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Color</h3>
                        <div className="flex flex-wrap gap-2">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => handleFilterChange('color', color)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition flex items-center justify-center ${
                                        localFilters.color === color 
                                            ? 'ring-2 ring-offset-2 ring-pink-500 dark:ring-offset-gray-800' : ''
                                    } ${getColorClass(color)} border`}
                                    style={{ minWidth: '40px' }}
                                    title={color}
                                >
                                    {color === 'All' ? 'All' : (localFilters.color === color ? <CheckCircle size={16} /> : <div className='w-4 h-4 rounded-full border border-gray-900/20'></div>)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sort By */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Sort By</h3>
                        <div className="space-y-2">
                            {sortingOptions.map(option => (
                                <div key={option} className="flex items-center">
                                    <input
                                        type="radio"
                                        id={option}
                                        name="sort"
                                        value={option}
                                        checked={localFilters.sort === option}
                                        onChange={() => handleFilterChange('sort', option)}
                                        className="h-4 w-4 text-pink-600 border-gray-300 focus:ring-pink-500"
                                    />
                                    <label htmlFor={option} className="ml-3 text-gray-700 dark:text-gray-300 text-sm">{option}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t dark:border-gray-700 space-y-3">
                    <button
                        onClick={handleApply}
                        className="w-full py-3 text-white font-semibold rounded-lg transition duration-300 bg-gray-900 hover:bg-pink-600 shadow-lg"
                    >
                        Apply Filters
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full py-3 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition duration-300 border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Reset All
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Core Components ---

const ProductCard = ({ product, addToCart, onViewDetails, toggleWishlist, isWishlisted, theme, getAccentClass }) => {
    const primaryBgClass = getAccentClass(theme, 'bg');
    const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white';
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`${cardBgClass} rounded-xl shadow-lg hover:shadow-2xl dark:hover:shadow-white/10 transition-all duration-300 overflow-hidden group cursor-pointer border dark:border-gray-700`}>
          <div className="relative overflow-hidden" onClick={() => onViewDetails(product)}>
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-80 object-cover transform group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x500/1F2937/FFFFFF?text=Image+Missing"; }}
            />
            <button
              className="absolute top-3 right-3 p-2 bg-white/70 backdrop-blur-sm rounded-full text-gray-800 transition duration-300 opacity-0 group-hover:opacity-100"
              aria-label="Add to Wishlist"
              onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }} // Prevent card click event
            >
              <Heart size={20} className={isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-800'} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            {product.isNew && (
              <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold bg-pink-500 text-white rounded-full">
                NEW
              </span>
            )}
          </div>
          <div className="p-4 flex flex-col items-center text-center">
            <p className={`text-xs ${textSecondaryClass} uppercase tracking-widest`}>{product.category}</p>
            <h3 className={`text-lg font-semibold ${textPrimaryClass} mt-1 truncate w-full px-2`}>{product.name}</h3>
            <p className={`text-xl font-bold ${textPrimaryClass} mt-2`}>${product.price.toFixed(2)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(product, product.size.split(',')[0].trim(), 1); }} // Quick add default size
              className={`mt-4 w-full px-4 py-2 text-white rounded-lg transition duration-300 flex items-center justify-center text-sm font-medium shadow-md bg-gray-900 hover:${primaryBgClass}`}
            >
              <ShoppingCart size={18} className="mr-2" /> Quick Add
            </button>
          </div>
        </div>
    );
};

const ProductDetailPage = ({ product, addToCart, onBack, toggleWishlist, isWishlisted, theme, showToast }) => {
  const availableSizes = useMemo(() => product.size.split(',').map(s => s.trim()), [product.size]);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || 'N/A');
  const [quantity, setQuantity] = useState(1);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const primaryBgClass = getAccentClass(theme, 'bg');
  const primaryTextClass = getAccentClass(theme, 'text');
  const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-700';


  const handleAddToCart = () => {
    addToCart(product, selectedSize, quantity);
    showToast(`Added ${quantity} x ${product.name} to cart!`, 'success');
  };
    
  const generateImage = useCallback(async () => {
        setIsGenerating(true);
        setGeneratedImage(null);
        showToast("Generating image, this may take a moment...", 'info');
        
        const userPrompt = `A photorealistic studio shot of a model wearing the product: ${product.name} in ${product.color} color, with a clean fashion magazine aesthetic. Full focus, high detail.`;

        const apiKey = ""
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

        const payload = { 
            instances: { prompt: userPrompt }, 
            parameters: { "sampleCount": 1} 
        };

        const executeFetch = async (attempt = 0) => {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s...
            if (attempt > 0) await new Promise(res => setTimeout(res, delay));

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (response.status === 429 && attempt < 3) {
                        // Rate limit exceeded, retry
                        return executeFetch(attempt + 1);
                    }
                    throw new Error(`API Error: ${response.statusText}`);
                }

                const result = await response.json();
                
                if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                    const base64Data = result.predictions[0].bytesBase64Encoded;
                    return `data:image/png;base64,${base64Data}`;
                } else {
                    throw new Error('Image data not found in response.');
                }
            } catch (error) {
                console.error("Image generation failed:", error);
                throw error;
            }
        };

        try {
            const imageUrl = await executeFetch();
            setGeneratedImage(imageUrl);
            showToast("Realistic image generated!", 'success');
        } catch (error) {
            showToast("Failed to generate image. Please try again.", 'error');
        } finally {
            setIsGenerating(false);
        }
    }, [product, showToast]);


  return (
    <div className={`${cardBgClass} rounded-xl shadow-lg p-6 lg:p-10`}>
      <button 
        onClick={onBack} 
        className={`${textSecondaryClass} hover:${primaryTextClass} flex items-center mb-6 text-sm font-medium transition duration-300`}
      >
        <ChevronLeft size={20} className="mr-1" /> Back to Products
      </button>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Image Column */}
        <div className="w-full lg:w-1/2 relative space-y-4">
          <img
            src={generatedImage || product.image}
            alt={product.name}
            className="w-full h-auto object-cover rounded-xl shadow-xl border border-gray-300 dark:border-gray-700"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x750/1F2937/FFFFFF?text=Image+Missing"; }}
          />

          <button
                onClick={generateImage}
                disabled={isGenerating}
                className={`w-full py-3 text-white font-semibold rounded-lg transition duration-300 flex items-center justify-center text-sm shadow-md ${primaryBgClass} ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={20} className="mr-2 animate-spin" /> Generating...
                    </>
                ) : (
                    <>
                        <Zap size={20} className="mr-2" /> Generate Realistic Image
                    </>
                )}
            </button>
            {generatedImage && (
                <p className={`${textSecondaryClass} text-center text-xs`}>*Image generated by AI. Reset upon navigation.</p>
            )}

        </div>

        {/* Details Column */}
        <div className="w-full lg:w-1/2">
          <p className="text-sm text-gray-500 uppercase tracking-widest">{product.category}</p>
          <h1 className={`text-4xl font-extrabold ${textPrimaryClass} mt-2`}>{product.name}</h1>
          <p className={`text-3xl font-bold ${primaryTextClass} mt-4`}>${product.price.toFixed(2)}</p>
          
          <div className={`${textSecondaryClass} space-y-4 border-t pt-4 mt-6 border-gray-200 dark:border-gray-700`}>
            <h3 className={`font-semibold text-xl ${textPrimaryClass}`}>Description</h3>
            <p className="text-base">
              The perfect balance of comfort and style. This item features a durable, soft fabric blend, suitable for all-day wear. Available in multiple colors and fits.
            </p>
            <p className="text-sm">
                <span className={`font-medium ${textPrimaryClass} mr-2`}>Color:</span> {product.color}
            </p>
            <p className="text-sm flex items-center">
                <span className={`font-medium ${textPrimaryClass} mr-2`}>Rating:</span>
                <span className="text-yellow-500">{'★'.repeat(Math.floor(product.rating))}</span> 
                <span className="text-gray-300">{'★'.repeat(5 - Math.floor(product.rating))}</span> 
                <span className="text-xs ml-2">({product.rating})</span>
            </p>
          </div>

          {/* Size Selector */}
          <div className="mt-8">
            <h3 className={`font-semibold text-lg ${textPrimaryClass} mb-3`}>Select Size:</h3>
            <div className="flex flex-wrap gap-3">
              {availableSizes.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`px-4 py-2 border rounded-full transition duration-200 text-sm font-medium ${
                    selectedSize === s
                      ? `bg-gray-900 text-white border-gray-900 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-100`
                      : `${cardBgClass} ${textSecondaryClass} border-gray-300 dark:border-gray-700 hover:border-gray-900 dark:hover:border-gray-500`
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {selectedSize === 'N/A' && <p className="text-red-500 text-sm mt-2">Please select a size.</p>}
          </div>

          {/* Quantity and Add to Cart */}
          <div className="mt-8 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className={`flex items-center border rounded-lg w-full sm:w-auto ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className={`p-3 ${textSecondaryClass} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg transition`}
              >
                -
              </button>
              <span className={`px-4 font-medium ${textPrimaryClass}`}>{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className={`p-3 ${textSecondaryClass} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition`}
              >
                +
              </button>
            </div>
            
            <button
              onClick={handleAddToCart}
              disabled={selectedSize === 'N/A'}
              className={`flex-1 w-full py-3 text-white font-semibold rounded-lg transition duration-300 flex items-center justify-center text-lg shadow-lg disabled:bg-gray-400 ${primaryBgClass}`}
            >
              <ShoppingCart size={20} className="mr-2" /> Add to Cart
            </button>
          </div>

          <button
            onClick={() => toggleWishlist(product)}
            className={`mt-4 w-full py-3 border font-semibold rounded-lg transition duration-300 flex items-center justify-center text-lg 
                ${isWishlisted 
                    ? 'bg-red-50 border-red-500 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400' 
                    : `${theme.mode === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-900 text-gray-900 hover:bg-gray-100'}`
                }`
            }
          >
            <Heart size={20} className={`mr-2 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} fill={isWishlisted ? 'currentColor' : 'none'} /> 
            {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
          </button>

        </div>
      </div>
    </div>
  );
};

const CartItem = ({ item, updateQuantity, removeFromCart, theme }) => {
    const primaryTextClass = getAccentClass(theme, 'text');
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-800';
    const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`flex items-center justify-between py-4 border-b ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'} last:border-b-0`}>
          <div className="flex items-center space-x-4">
            <img
              src={item.image}
              alt={item.name}
              className="w-16 h-16 object-cover rounded-lg"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/64x64/1F2937/FFFFFF?text=IMG"; }}
            />
            <div>
              <h4 className={`font-semibold ${textPrimaryClass}`}>{item.name}</h4>
              <p className={`text-sm ${textSecondaryClass}`}>Color: {item.color}</p>
              <p className={`text-sm ${textSecondaryClass}`}>Size: <span className='font-medium text-gray-700 dark:text-gray-300'>{item.selectedSize}</span></p>
              <p className={`font-bold ${primaryTextClass} mt-1`}>${item.price.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className={`flex items-center border rounded-lg ${theme.mode === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
              <button
                onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className={`p-1.5 ${textSecondaryClass} disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg transition`}
              >
                -
              </button>
              <span className={`px-3 text-sm font-medium ${textPrimaryClass}`}>{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                className={`p-1.5 ${textSecondaryClass} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition`}
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeFromCart(item.cartId)}
              className="text-sm text-red-500 hover:text-red-700 transition"
            >
              Remove
            </button>
          </div>
        </div>
      );
};

const CartSidebar = ({ cart, updateCart, isOpen, onClose, onCheckout, theme }) => {
    
  const primaryBgClass = getAccentClass(theme, 'bg');
  const primaryTextClass = getAccentClass(theme, 'text');
  const cardBgClass = theme.mode === 'dark' ? 'bg-gray-900' : 'bg-white';
  const shadowClass = theme.mode === 'dark' ? 'shadow-white/10' : 'shadow-2xl';
  const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const borderClass = theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200';


  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const updateQuantity = useCallback((cartId, newQuantity) => {
    if (newQuantity < 1) {
        updateCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
    } else {
        updateCart(prevCart =>
            prevCart.map(item =>
                item.cartId === cartId ? { ...item, quantity: newQuantity } : item
            )
        );
    }
  }, [updateCart]);

  const removeFromCart = useCallback((cartId) => {
    updateCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  }, [updateCart]);

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black transition-opacity ${isOpen ? 'opacity-50' : 'opacity-0'}`} onClick={onClose}></div>

      {/* Sidebar Content */}
      <div className={`absolute right-0 top-0 bottom-0 w-full md:w-96 ${cardBgClass} ${shadowClass} flex flex-col`}>
        <div className={`p-6 border-b ${borderClass} flex justify-between items-center`}>
          <h2 className={`text-2xl font-bold ${textPrimaryClass}`}>Shopping Cart ({cart.length})</h2>
          <button onClick={onClose} className={`text-gray-500 hover:${primaryTextClass} transition p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700`}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-2">
          {cart.length === 0 ? (
            <div className={`text-center py-10 ${textSecondaryClass}`}>
              <ShoppingCart size={32} className="mx-auto mb-3" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem
                key={item.cartId}
                item={item}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                theme={theme}
              />
            ))
          )}
        </div>

        <div className={`p-6 border-t ${borderClass} shadow-inner`}>
          <div className={`flex justify-between items-center text-xl font-bold ${textPrimaryClass} mb-4`}>
            <span>Subtotal:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 text-white font-semibold rounded-lg transition duration-300 disabled:bg-gray-400 shadow-lg ${primaryBgClass}`}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

const UserProfileView = ({ userId, onBack, auth, navigateToWishlist, navigateToOrderHistory, getAccentClass, theme }) => {
    const handleSignOut = async () => {
        if (auth) {
            try {
                await signOut(auth);
                console.log("User signed out successfully.");
            } catch (error) {
                console.error("Error signing out:", error);
            }
        }
        onBack();
    };

    const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white';
    const highlightBgClass = theme.mode === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-pink-100';
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const textSecondaryClass = theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const primaryTextClass = getAccentClass(theme, 'text');

    return (
        <div className={`${cardBgClass} rounded-xl shadow-lg p-6 lg:p-10 max-w-3xl mx-auto`}>
            <button 
                onClick={onBack} 
                className={`${textSecondaryClass} hover:${primaryTextClass} flex items-center mb-8 text-sm font-medium transition duration-300`}
            >
                <ChevronLeft size={20} className="mr-1" /> Back to Shopping
            </button>

            <h1 className={`text-4xl font-extrabold ${textPrimaryClass} mb-2`}>My Profile</h1>
            <p className={`${textSecondaryClass} mb-8`}>Welcome to your StyleSync dashboard.</p>

            <div className="space-y-6">
                <div className={`${highlightBgClass} p-6 rounded-xl border`}>
                    <h2 className={`text-xl font-semibold ${textPrimaryClass} mb-3 flex items-center`}>
                        <User size={20} className={`mr-2 ${primaryTextClass}`} /> Account Status
                    </h2>
                    <p className={`text-sm ${textSecondaryClass} break-all`}>
                        <span className={`font-medium ${textSecondaryClass} mr-2`}>User ID:</span> 
                        {userId || "Not Available"}
                    </p>
                    <p className={`text-sm ${textSecondaryClass} mt-2`}>
                        <span className={`font-medium ${textSecondaryClass} mr-2`}>Authentication:</span> 
                        Currently signed in anonymously.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Order History Button */}
                    <button 
                        onClick={navigateToOrderHistory}
                        className={`flex flex-col items-start p-4 ${cardBgClass} border rounded-xl hover:border-${getAccentClass(theme, 'border')} hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 shadow-sm ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                        <Package size={24} className={`mb-2 ${primaryTextClass}`} />
                        <span className={`font-semibold ${textPrimaryClass}`}>Order History</span>
                        <span className={`text-sm ${textSecondaryClass}`}>View past purchases and invoices.</span>
                    </button>
                    {/* Wishlist Button */}
                    <button 
                        onClick={navigateToWishlist}
                        className={`flex flex-col items-start p-4 ${cardBgClass} border rounded-xl hover:border-${getAccentClass(theme, 'border')} hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 shadow-sm ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                    >
                        <Heart size={24} className={`mb-2 ${primaryTextClass}`} fill={getAccentClass(theme, 'fill')} />
                        <span className={`font-semibold ${textPrimaryClass}`}>Wishlist</span>
                        <span className={`text-sm ${textSecondaryClass}`}>See all your saved items.</span>
                    </button>
                    {/* Static Links */}
                    <button className={`flex flex-col items-start p-4 ${cardBgClass} border rounded-xl hover:border-${getAccentClass(theme, 'border')} hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 shadow-sm ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <MapPin size={24} className={`mb-2 ${primaryTextClass}`} />
                        <span className={`font-semibold ${textPrimaryClass}`}>Addresses</span>
                        <span className={`text-sm ${textSecondaryClass}`}>Manage your shipping details.</span>
                    </button>
                    <button className={`flex flex-col items-start p-4 ${cardBgClass} border rounded-xl hover:border-${getAccentClass(theme, 'border')} hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-300 shadow-sm ${theme.mode === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <User size={24} className={`mb-2 ${primaryTextClass}`} />
                        <span className={`font-semibold ${textPrimaryClass}`}>Personal Info</span>
                        <span className={`text-sm ${textSecondaryClass}`}>Update your details.</span>
                    </button>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full py-3 mt-8 flex items-center justify-center bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-300 shadow-md"
                >
                    <LogOut size={20} className="mr-2" /> Sign Out
                </button>
            </div>
        </div>
    );
};


// --- Main App Component ---

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Theme State ---
  const [theme, setTheme] = useState({
      mode: 'light', // 'light' or 'dark'
      accentColor: 'pink' // 'pink', 'blue', or 'teal'
  });
    
  // Toast State
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
      setToast({ message, type });
  }, []);

  // --- Firestore States ---
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]); 
  const [searchTerm, setSearchTerm] = useState(''); 

  // --- UI States ---
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [view, setView] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filters, setFilters] = useState({
    category: 'All',
    color: 'All',
    sort: 'Newest',
  });

  const cartItemCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
    
  // --- Firestore Persistence Logic for Cart and Wishlist (Moved Up) ---

  const saveCartToFirestore = useCallback(async (currentCart) => {
    if (!db || !userId) {
      console.warn("Firestore or User ID not available. Cannot save cart.");
      return;
    }
    const cartPath = `/artifacts/${appId}/users/${userId}/cart/currentCart`;
    try {
      await setDoc(doc(db, cartPath), { items: currentCart, lastUpdated: new Date() });
    } catch (error) {
      console.error("Error saving cart to Firestore:", error);
    }
  }, [db, userId]);

  // Wrapper function for setCart that handles Firestore interaction
  const updateCart = useCallback((updateFn) => {
    setCart(prevCart => {
        const newCart = updateFn(prevCart);
        return newCart;
    });
  }, []);

  const saveWishlistToFirestore = useCallback(async (currentWishlist) => {
    if (!db || !userId) {
      console.warn("Firestore or User ID not available. Cannot save wishlist.");
      return;
    }
    const wishlistPath = `/artifacts/${appId}/users/${userId}/wishlist/currentWishlist`;
    try {
      await setDoc(doc(db, wishlistPath), { items: currentWishlist, lastUpdated: new Date() });
    } catch (error) {
      console.error("Error saving wishlist to Firestore:", error);
    }
  }, [db, userId]);
    
  // Apply Dark Mode class to HTML element
  useEffect(() => {
    if (theme.mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme.mode]);
    
  // Theme Toggler for the Navbar
  const toggleTheme = () => {
    setTheme(prev => ({ 
        ...prev, 
        mode: prev.mode === 'light' ? 'dark' : 'light' 
    }));
  };
    
  const toggleAccentColor = () => {
      setTheme(prev => ({
          ...prev,
          accentColor: prev.accentColor === 'pink' ? 'teal' : (prev.accentColor === 'teal' ? 'blue' : 'pink')
      }));
  };

  // --- Navigation and Actions ---

  const navigateToProduct = useCallback((product) => {
    setSelectedProduct(product);
    setView('product');
  }, []);

  const navigateToHome = useCallback(() => {
    setSelectedProduct(null);
    setView('home');
  }, []);

  const navigateToProfile = useCallback(() => {
    setView('profile');
  }, []);

  const navigateToWishlist = useCallback(() => {
    setView('wishlist');
  }, []);
    
  const navigateToOrderHistory = useCallback(() => {
    setView('orders');
  }, []);

  const navigateToCheckout = useCallback(() => {
    setIsCartOpen(false);
    setView('checkout');
  }, []);
    
  const handleCheckoutSuccess = useCallback(() => {
    setCart([]); // Clear the cart after successful order
    showToast("Order placed successfully!", 'success');
    setView('success'); // Navigate to the success page
  }, [showToast]);

  const addToCart = useCallback((product, selectedSize, quantity) => {
    const newItem = { 
        ...product, 
        quantity: quantity, 
        selectedSize: selectedSize,
        cartId: Date.now() + Math.random() 
    };
    updateCart(prevCart => [...prevCart, newItem]);
    setIsCartOpen(true);
    showToast(`Added ${quantity}x ${product.name} to cart.`, 'success');
  }, [updateCart, showToast]);

  const isWishlisted = useCallback((productId) => {
      return wishlist.some(item => item.id === productId);
  }, [wishlist]);

  const toggleWishlist = useCallback((product) => {
    setWishlist(prevWishlist => {
        let newWishlist;
        let message;
        if (isWishlisted(product.id)) {
            // Remove from wishlist
            newWishlist = prevWishlist.filter(item => item.id !== product.id);
            message = `${product.name} removed from Wishlist.`;
        } else {
            // Add to wishlist
            const { id, name, price, image, category } = product;
            newWishlist = [...prevWishlist, { id, name, price, image, category }];
            message = `${product.name} added to Wishlist.`;
        }
        showToast(message, 'info');
        return newWishlist;
    });
  }, [isWishlisted, showToast]);

  const removeFromWishlist = useCallback((productId) => {
    setWishlist(prevWishlist => prevWishlist.filter(item => item.id !== productId));
    showToast("Item removed from Wishlist.", 'info');
  }, [showToast]);

  
  useEffect(() => {
    if (db && userId && !isLoading) {
      saveWishlistToFirestore(wishlist);
    }
  }, [wishlist, db, userId, saveWishlistToFirestore, isLoading]);

  // --- Core Firebase Initialization and Auth ---

  useEffect(() => {
    if (firebaseConfig) {
      try {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        
        setDb(dbInstance);
        setAuth(authInstance);

        const authenticateUser = async (auth) => {
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken).catch(e => {
                console.error("Custom token sign-in failed, trying anonymous:", e);
                return signInAnonymously(auth);
            });
          } else {
            await signInAnonymously(auth);
          }
        };
        
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
          if (user) {
            setUserId(user.uid);
            setIsLoading(false); 
          } else {
            setUserId(null); 
            setIsLoading(false);
            setCart([]);
            setWishlist([]); 
            if (['profile', 'wishlist', 'checkout', 'orders'].includes(view)) setView('home'); 
          }
        });

        authenticateUser(authInstance);
        return () => unsubscribe();

      } catch (error) {
        console.error("Error initializing Firebase:", error);
        setIsLoading(false);
      }
    } else {
        console.warn("Firebase configuration not found. Running in mock-data mode.");
        setUserId(crypto.randomUUID()); 
        setIsLoading(false);
    }
  }, []); 

  // --- Firestore Real-time Listeners (Cart and Wishlist) ---

  useEffect(() => {
    let unsubscribeCart = () => {};
    let unsubscribeWishlist = () => {};
    
    if (db && userId) {
      // 1. Cart Listener
      const cartPath = `/artifacts/${appId}/users/${userId}/cart/currentCart`;
      unsubscribeCart = onSnapshot(doc(db, cartPath), (docSnap) => {
        if (docSnap.exists() && docSnap.data().items) {
          setCart(docSnap.data().items);
        } else {
          saveCartToFirestore([]);
          setCart([]);
        }
      }, (error) => {
        console.error("Error setting up cart listener:", error);
      });

      // 2. Wishlist Listener
      const wishlistPath = `/artifacts/${appId}/users/${userId}/wishlist/currentWishlist`;
      unsubscribeWishlist = onSnapshot(doc(db, wishlistPath), (docSnap) => {
        if (docSnap.exists() && docSnap.data().items) {
          setWishlist(docSnap.data().items);
        } else {
          saveWishlistToFirestore([]);
          setWishlist([]);
        }
      }, (error) => {
        console.error("Error setting up wishlist listener:", error);
      });

    } else if (userId === null) {
        setCart([]);
        setWishlist([]);
    }

    return () => {
        unsubscribeCart();
        unsubscribeWishlist();
    };
  }, [db, userId, saveCartToFirestore, saveWishlistToFirestore]);

  // Sync Cart to Firestore whenever local state changes
  useEffect(() => {
    if (db && userId && !isLoading) {
      saveCartToFirestore(cart);
    }
  }, [cart, db, userId, saveCartToFirestore, isLoading]);

  // --- Filtering, Sorting, and Searching Logic ---

  const filteredAndSortedProducts = useMemo(() => {
    let results = mockProducts;

    // 0. Search Filter
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        results = results.filter(p => 
            p.name.toLowerCase().includes(lowerCaseSearch) ||
            p.category.toLowerCase().includes(lowerCaseSearch) ||
            p.color.toLowerCase().includes(lowerCaseSearch)
        );
    }

    // 1. Category Filter
    if (filters.category !== 'All') {
      results = results.filter(p => p.category === filters.category);
    }

    // 2. Color Filter
    if (filters.color !== 'All') {
      results = results.filter(p => p.color === filters.color);
    }

    // 3. Sort
    switch (filters.sort) {
      case 'Price: Low to High':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'Price: High to Low':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'Rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'Newest':
      default:
        results.sort((a, b) => (b.isNew - a.isNew) || (a.id - b.id));
        break;
    }

    return results;
  }, [filters, searchTerm]);

  // --- Render Functions ---

  const renderMainContent = () => {
    if (view === 'success') {
        return <OrderSuccessView onNavigateHome={navigateToHome} />;
    }
      
    if (view === 'checkout') {
        return <CheckoutView cart={cart} onNavigateHome={navigateToHome} onCheckoutSuccess={handleCheckoutSuccess} />;
    }
      
    if (view === 'orders') {
        return <OrderHistoryView onBack={navigateToProfile} getAccentClass={getAccentClass} theme={theme} />;
    }
      
    if (view === 'profile') {
        return <UserProfileView userId={userId} onBack={navigateToHome} auth={auth} navigateToWishlist={navigateToWishlist} navigateToOrderHistory={navigateToOrderHistory} getAccentClass={getAccentClass} theme={theme} />;
    }
    
    if (view === 'wishlist') {
        return <WishlistView wishlist={wishlist} onBack={navigateToProfile} addToCart={addToCart} removeFromWishlist={removeFromWishlist} onViewDetails={navigateToProduct} getAccentClass={getAccentClass} theme={theme} />;
    }

    if (view === 'product' && selectedProduct) {
        return (
            <ProductDetailPage 
                product={selectedProduct} 
                addToCart={addToCart} 
                onBack={navigateToHome}
                toggleWishlist={toggleWishlist}
                isWishlisted={isWishlisted(selectedProduct.id)}
                theme={theme}
                showToast={showToast}
            />
        );
    }

    // Default Home View
    const primaryBgClass = getAccentClass(theme, 'bg');
    const primaryTextClass = getAccentClass(theme, 'text');
    const cardBgClass = theme.mode === 'dark' ? 'bg-gray-800' : 'bg-white';
    const textPrimaryClass = theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900';

    return (
        <>
            <h1 className={`text-4xl font-extrabold ${textPrimaryClass} mb-6`}>Discover New Arrivals</h1>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b dark:border-gray-700 pb-4 space-y-4 sm:space-y-0">
                <div className="relative w-full sm:w-1/2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full py-2 pl-10 pr-4 border rounded-lg focus:ring-4 transition shadow-sm 
                            ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-gray-600/50' : 'bg-white border-gray-300 text-gray-900 focus:ring-pink-500/50'}`
                        }
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')} 
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            aria-label="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition shadow-sm w-full sm:w-auto sm:ml-4 justify-center 
                        ${theme.mode === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}`
                    }
                >
                    <Filter size={18} />
                    <span>Filter & Sort</span>
                </button>
                <p className={`text-sm ${theme.mode === 'dark' ? 'text-gray-400' : 'text-gray-600'} hidden lg:block`}>
                    Showing {filteredAndSortedProducts.length} items
                </p>
            </div>

            {/* Product Grid */}
            {filteredAndSortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                {filteredAndSortedProducts.map(product => (
                <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onViewDetails={navigateToProduct}
                    toggleWishlist={toggleWishlist}
                    isWishlisted={isWishlisted(product.id)}
                    theme={theme}
                    getAccentClass={getAccentClass}
                />
                ))}
            </div>
            ) : (
            <div className={`text-center py-20 ${cardBgClass} rounded-xl shadow-lg mt-8`}>
                <h2 className={`text-2xl font-semibold ${textPrimaryClass}`}>No Products Found</h2>
                <p className={`text-gray-500 mt-2`}>Try adjusting your filters, searching for a different item, or clearing them all.</p>
                <button
                onClick={() => { setFilters({ category: 'All', color: 'All', sort: 'Newest' }); setSearchTerm(''); }}
                className={`mt-4 px-6 py-2 text-white font-medium rounded-lg transition ${primaryBgClass}`}
                >
                Clear All
                </button>
            </div>
            )}
        </>
    );
  };

  return (
    <div className={`min-h-screen ${theme.mode === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} font-sans`}>
        {/* Loading Overlay */}
        {isLoading && (
            <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className={`h-10 w-10 ${getAccentClass(theme, 'text')} animate-spin`} />
                    <p className={`mt-3 text-lg font-medium ${theme.mode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Connecting to StyleSync...</p>
                </div>
            </div>
        )}

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-md dark:shadow-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <a href="#" onClick={navigateToHome} className={`text-2xl font-extrabold tracking-tight ${theme.mode === 'dark' ? 'text-gray-100' : 'text-gray-900'} uppercase`}>
            Style<span className={getAccentClass(theme, 'text')}>Sync</span>
          </a>
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Theme & Accent Switchers */}
            <div className='flex space-x-2'>
                <button 
                    onClick={toggleTheme}
                    className={`text-gray-600 dark:text-gray-400 hover:${getAccentClass(theme, 'text')} transition p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700`}
                    aria-label="Toggle Theme"
                >
                    {theme.mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button 
                    onClick={toggleAccentColor}
                    className={`w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 shadow-inner transition ${getAccentClass(theme, 'bg')}`}
                    aria-label="Change Accent Color"
                >
                </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                User ID: <span className='font-mono text-gray-700 dark:text-gray-300'>{userId || 'Loading...'}</span>
            </p>
            <button className="text-gray-600 dark:text-gray-400 hover:text-pink-600 transition" aria-label="Search">
              <Search size={20} />
            </button>
            <button 
                onClick={navigateToProfile}
                className={`text-gray-600 dark:text-gray-400 hover:${getAccentClass(theme, 'text')} transition`} aria-label="Account"
            >
              <User size={20} />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative text-gray-600 dark:text-gray-400 hover:${getAccentClass(theme, 'text')} transition p-1`}
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${getAccentClass(theme, 'bg')}`}>
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {renderMainContent()}
      </main>

      {/* Cart Sidebar */}
      <CartSidebar
        cart={cart}
        updateCart={updateCart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={navigateToCheckout} // New handler for checkout
        theme={theme}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        filters={filters}
        setFilters={setFilters}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
      
      {/* Toast Notification */}
      {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default App;
import React, { useState, useMemo } from 'react';
import { Star, Trash2, Plus, Minus, HelpCircle, ChevronDown, PackageOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ORIGIN_STATE = 'OH';
const ORIGIN_COUNTY = 'Cuyahoga';

const TAX_RATES: Record<string, Record<string, number>> = {
  'OH': {
    'Cuyahoga': 0.08,
    'Summit': 0.0675,
    'Franklin': 0.075,
  },
  'FL': {
    'Miami-Dade': 0.07,
    'Broward': 0.06,
  }
};

interface Product {
  id: string;
  name: string;
  code: string;
  price: number;
  isTaxable: boolean;
  isShippingProduct?: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

const PRODUCTS_DB: Product[] = [
  { id: '1', name: 'Mercy Protective Services - Lost Badge', code: '3000-1005-82300-941015', price: 30.00, isTaxable: false },
  { id: '2', name: 'Mercy Protective Services - Fingerprints', code: '2320-2320-85309-941010', price: 46.00, isTaxable: false },
  { id: '3', name: 'Mercy - Sgl Mth Membership', code: '2320-2324-14471-750030', price: 40.00, isTaxable: true },
  { id: '4', name: 'Mercy - Cpl Year Membership', code: '2320-2324-14471-750030', price: 500.00, isTaxable: true },
  { id: '5', name: 'Akron Challenge Golf', code: '2001-2045-36010-750280', price: 50.00, isTaxable: false },
  { id: '6', name: 'Wadsworth - Sports Physical', code: '1002-1268-15153-940110', price: 55.00, isTaxable: false },
  { id: '7', name: 'IR Concierge - Adult Concierge Membership', code: '3150-9000-90000-249190', price: 5750.00, isTaxable: true },
  { id: '8', name: 'IR Concierge - 18 to 26 Concierge Membership', code: '3150-9000-90000-249190', price: 2500.00, isTaxable: false },
  { id: '9', name: 'Weston Vaccine Concierge - Hepatitis B Vaccine', code: '3026-3000-13365-750010', price: 62.67, isTaxable: true },
  { id: '10', name: 'Shipping & Handling Fee', code: 'SHIPPING-FEE-001', price: 15.00, isTaxable: false, isShippingProduct: true },
];

export default function POSApp() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDelivery, setIsDelivery] = useState(false);
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: 'OH',
    zip: ''
  });

  const lookupCounty = (state: string, zip: string): string | null => {
    if (zip.length < 5) return null;
    const mockDb: Record<string, string> = {
      '44195': 'Cuyahoga',
      '44308': 'Summit',
      '43215': 'Franklin',
      '33101': 'Miami-Dade',
      '33301': 'Broward'
    };
    return mockDb[zip] || 'Unknown';
  };

  const derivedCounty = useMemo(
    () => lookupCounty(shippingAddress.state, shippingAddress.zip),
    [shippingAddress.state, shippingAddress.zip]
  );

  const handleAddressChange = (field: string, value: string) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
    setIsAddressVerified(false);
  };

  const handleVerifyAddress = () => {
    if (shippingAddress.zip.length >= 5) {
      setIsAddressVerified(true);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleCheckout = () => {
    const payload = {
      items: cart,
      subtotal: totals.subtotal,
      tax: totals.taxAmount,
      total: totals.total,
      shipping: isDelivery ? 'Yes' : 'No',
      shippingDetails: isDelivery ? { address: shippingAddress, county: derivedCounty } : null
    };
    console.log("Checkout Payload:", payload);
    alert(`Checkout Successful!\nTotal: $${totals.total.toFixed(2)}\nShipping: ${payload.shipping}\n(Check console for full payload)`);
    clearCart();
    setIsDelivery(false);
    setIsAddressVerified(false);
  };

  const taxInfo = useMemo(() => {
    if (!isDelivery) {
      return {
        rate: TAX_RATES[ORIGIN_STATE][ORIGIN_COUNTY],
        status: 'in-person',
        message: `In-Person (${ORIGIN_COUNTY}, ${ORIGIN_STATE})`
      };
    }

    if (!isAddressVerified) {
      return { rate: 0, status: 'unverified', message: '' };
    }

    if (shippingAddress.state !== ORIGIN_STATE && shippingAddress.state !== 'FL') {
      return {
        rate: 0,
        status: 'interstate',
        message: 'Interstate Shipping: No sales tax applied.'
      };
    }

    const stateRates = TAX_RATES[shippingAddress.state] || {};
    const countyRate = derivedCounty ? stateRates[derivedCounty] : undefined;

    if (countyRate !== undefined) {
      return {
        rate: countyRate,
        status: 'intrastate',
        message: `Intrastate Shipping (${derivedCounty} County: ${(countyRate * 100).toFixed(2)}%)`
      };
    } else {
      return {
        rate: 0,
        status: 'error',
        message: 'Error: Tax rate/County could not be determined for this address. Checkout blocked.'
      };
    }
  }, [isDelivery, isAddressVerified, shippingAddress.state, shippingAddress.zip, derivedCounty]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let regularTaxableSubtotal = 0;
    let regularNonTaxableSubtotal = 0;
    let shippingProductTotal = 0;
    let itemsCount = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      itemsCount += item.quantity;

      if (item.isShippingProduct) {
        shippingProductTotal += itemTotal;
      } else if (item.isTaxable) {
        regularTaxableSubtotal += itemTotal;
      } else {
        regularNonTaxableSubtotal += itemTotal;
      }
    });

    const regularSubtotal = regularTaxableSubtotal + regularNonTaxableSubtotal;

    let shippingTaxablePortion = 0;
    if (shippingProductTotal > 0 && regularSubtotal > 0) {
      const taxableRatio = regularTaxableSubtotal / regularSubtotal;
      shippingTaxablePortion = shippingProductTotal * taxableRatio;
    } else if (shippingProductTotal > 0 && regularTaxableSubtotal > 0 && regularNonTaxableSubtotal === 0) {
      shippingTaxablePortion = shippingProductTotal;
    }

    const totalTaxableBase = regularTaxableSubtotal + shippingTaxablePortion;
    const taxAmount = (taxInfo.status === 'error' || taxInfo.status === 'unverified') ? 0 : (totalTaxableBase * taxInfo.rate);
    const total = subtotal + taxAmount;

    return {
      itemsCount,
      subtotal,
      totalTaxableBase,
      proratedShippingTaxable: shippingTaxablePortion,
      taxAmount,
      total,
      isBlocked: taxInfo.status === 'error' || taxInfo.status === 'unverified'
    };
  }, [cart, taxInfo]);

  const filteredProducts = PRODUCTS_DB.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-700 flex items-center justify-center rounded-sm">
              <PackageOpen className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Cleveland Clinic</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <button className="flex items-center gap-1 hover:text-slate-900 transition-colors">
              <HelpCircle className="w-4 h-4" /> Help Center
            </button>
            <button className="flex items-center gap-1 hover:text-slate-900 transition-colors">
              Actions <ChevronDown className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-semibold text-xs">AA</div>
              <span className="font-medium">Amy Admin</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 space-x-8 text-sm font-medium border-t border-slate-100">
          <button className="py-3 border-b-2 border-blue-600 text-blue-700 flex items-center gap-2">
            <PackageOpen className="w-4 h-4" /> Cashier
          </button>
          <button className="py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors">Misc Payments</button>
          <button className="py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors">Products</button>
          <button className="py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors">GL Codes</button>
          <button className="py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors">Tax Rates</button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6">

        {/* LEFT PANEL - PRODUCTS */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="w-full max-w-md">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Search Product</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Start typing..."
                  className="w-full border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <div className="w-8 h-4 bg-slate-200 rounded-full relative cursor-pointer">
                <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
              </div>
              <span className="text-sm text-slate-600">Frequent</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <PackageOpen className="w-10 h-10 opacity-20" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <tbody>
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <td className="p-4 w-12 text-slate-300 group-hover:text-yellow-400 transition-colors">
                        <Star className="w-5 h-5 fill-current" />
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 text-sm">
                          {product.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">{product.code}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-slate-800 text-sm">${product.price.toFixed(2)}</div>
                        <div className="text-xs text-slate-500 mt-1">{product.isTaxable ? 'Taxable' : 'Non-Taxable'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - CART & CHECKOUT */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-140px)]">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              Cart
              {cart.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{totals.itemsCount}</span>
              )}
            </h2>
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
            >
              Clear Cart
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <PackageOpen className="w-12 h-12 opacity-20" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs text-slate-300">Click a product to add it</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map(item => (
                  <li key={item.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg group transition-colors">
                    <div className="flex items-center border border-slate-200 rounded-md bg-white overflow-hidden shrink-0 mt-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center border-x border-slate-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                        <span>${item.price.toFixed(2)} each</span>
                        <span>•</span>
                        {item.isShippingProduct ? (
                          <span className="text-blue-600 font-semibold">Prorated Tax</span>
                        ) : (
                          <span>{item.isTaxable ? 'Taxable' : 'Non-Taxable'}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-sm font-bold text-slate-800">${(item.price * item.quantity).toFixed(2)}</div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 border border-red-100 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* CHECKOUT SECTION */}
          <div className="bg-slate-50 p-5 rounded-b-lg border-t border-slate-200 space-y-4">

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Items</span>
                <span className="font-medium">{totals.itemsCount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-600 items-start">
                <div className="flex flex-col">
                  <span>Sales Tax</span>
                  {totals.taxAmount > 0 && (
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {(taxInfo.rate * 100).toFixed(2)}% on ${totals.totalTaxableBase.toFixed(2)} taxable
                    </span>
                  )}
                </div>
                <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Toggle & Form */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDelivery ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isDelivery}
                    onChange={(e) => {
                      setIsDelivery(e.target.checked);
                      if (!e.target.checked) setIsAddressVerified(false);
                    }}
                  />
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isDelivery ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-bold text-slate-800 select-none">Delivery</span>
              </label>

              {isDelivery && (
                <div className="mt-4 p-4 bg-white border border-blue-100 rounded-lg shadow-sm space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Address Line 1</label>
                    <input
                      type="text"
                      placeholder="123 Main St"
                      value={shippingAddress.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded p-1.5 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={shippingAddress.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded p-1.5 focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">State</label>
                      <select
                        value={shippingAddress.state}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded p-1.5 focus:border-blue-500 outline-none transition-colors"
                      >
                        <option value="OH">Ohio (OH)</option>
                        <option value="FL">Florida (FL)</option>
                        <option value="NY">New York (NY)</option>
                        <option value="CA">California (CA)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ZIP Code</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="e.g. 44195"
                        value={shippingAddress.zip}
                        onChange={(e) => handleAddressChange('zip', e.target.value.replace(/\D/g, ''))}
                        className="w-full text-sm border border-slate-300 rounded p-1.5 focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    Test ZIPs: 44195 (OH-Cuyahoga), 44308 (OH-Summit), 33101 (FL-Miami-Dade), 33301 (FL-Broward). Others trigger an error.
                  </div>

                  {!isAddressVerified ? (
                    <button
                      onClick={handleVerifyAddress}
                      disabled={shippingAddress.zip.length < 5}
                      className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                    >
                      Continue
                    </button>
                  ) : (
                    (taxInfo.status === 'error' || taxInfo.status === 'interstate') && (
                      <div className={`text-xs p-2 rounded flex items-start gap-2 ${
                        taxInfo.status === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {taxInfo.status === 'error'
                          ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span>{taxInfo.message}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || totals.isBlocked}
              className={`w-full py-3.5 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2
                ${(cart.length === 0 || totals.isBlocked)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                }`}
            >
              Checkout ${(cart.length > 0 && !totals.isBlocked) ? totals.total.toFixed(2) : '0.00'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

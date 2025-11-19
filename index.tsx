
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { 
  ShoppingCart, 
  Search, 
  Menu, 
  Star, 
  Heart, 
  ChevronDown, 
  User, 
  X, 
  Send, 
  Loader2,
  Smartphone,
  Shirt,
  Monitor,
  Home as HomeIcon,
  Watch,
  Bot,
  Zap,
  Tag,
  ShoppingBag
} from "lucide-react";

// --- Configuration ---
const CATEGORIES = [
  { id: "mobiles", name: "Mobiles", icon: <Smartphone size={20} /> },
  { id: "fashion", name: "Fashion", icon: <Shirt size={20} /> },
  { id: "electronics", name: "Electronics", icon: <Monitor size={20} /> },
  { id: "home", name: "Home", icon: <HomeIcon size={20} /> },
  { id: "appliances", name: "Appliances", icon: <Zap size={20} /> },
];

const PRODUCTS = [
  {
    id: 1,
    name: "Apple iPhone 15 Pro (128 GB)",
    category: "mobiles",
    price: 129900,
    originalPrice: 134900,
    rating: 4.8,
    reviews: 3400,
    image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=500&q=60",
    description: "Titanium design, A17 Pro chip",
    offer: "Best Seller"
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    category: "mobiles",
    price: 129999,
    originalPrice: 144999,
    rating: 4.7,
    reviews: 1205,
    image: "https://images.unsplash.com/photo-1706606996392-08153275c52b?auto=format&fit=crop&w=500&q=60",
    description: "AI features, 200MP Camera",
    offer: "Trending"
  },
  {
    id: 3,
    name: "Sony WH-1000XM5 Headphones",
    category: "electronics",
    price: 26990,
    originalPrice: 34990,
    rating: 4.6,
    reviews: 8500,
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=500&q=60",
    description: "Industry leading noise cancelling",
    offer: "Deal of the Day"
  },
  {
    id: 4,
    name: "Nike Air Jordan 1 Mid",
    category: "fashion",
    price: 11495,
    originalPrice: 12995,
    rating: 4.5,
    reviews: 560,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=60",
    description: "Classic basketball style",
    offer: ""
  },
  {
    id: 5,
    name: "Apple MacBook Air M2",
    category: "electronics",
    price: 99900,
    originalPrice: 114900,
    rating: 4.9,
    reviews: 2100,
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=500&q=60",
    description: "Supercharged by M2",
    offer: "Top Rated"
  },
  {
    id: 6,
    name: "Puma RS-X Sneakers",
    category: "fashion",
    price: 4500,
    originalPrice: 8999,
    rating: 4.3,
    reviews: 1200,
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=500&q=60",
    description: "Retro design, chunky sole",
    offer: "50% Off"
  },
  {
    id: 7,
    name: "Dyson V12 Detect Slim",
    category: "home",
    price: 42900,
    originalPrice: 55900,
    rating: 4.7,
    reviews: 890,
    image: "https://images.unsplash.com/photo-1558317374-a309d9139463?auto=format&fit=crop&w=500&q=60",
    description: "Laser reveals microscopic dust",
    offer: ""
  },
  {
    id: 8,
    name: "Samsung 4K Smart TV 55\"",
    category: "electronics",
    price: 45990,
    originalPrice: 65900,
    rating: 4.4,
    reviews: 3400,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=60",
    description: "Crystal 4K Processor",
    offer: "Big Saving"
  },
];

// --- Types ---
type Product = typeof PRODUCTS[0];
type CartItem = Product & { quantity: number };

// --- AI Bargaining Modal ---
const BargainingModal = ({ 
  cartItems, 
  cartTotal, 
  onClose, 
  onFinalize 
}: { 
  cartItems: CartItem[], 
  cartTotal: number, 
  onClose: () => void, 
  onFinalize: (discount: number) => void 
}) => {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([
    { role: 'model', text: `The total is ₹${cartTotal.toLocaleString()}. I can offer you a small discount if you purchase now. What's your offer?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dealSealed, setDealSealed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const finalizeDealTool: FunctionDeclaration = {
    name: 'finalize_deal',
    description: 'Finalize the negotiated price and apply the discount.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        final_price: {
          type: Type.NUMBER,
          description: 'The agreed upon final price for the cart.',
        },
      },
      required: ['final_price'],
    },
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const itemsList = cartItems.map(i => `${i.name}`).join(", ");
      const minAcceptablePrice = Math.floor(cartTotal * 0.85); // 15% max discount

      const chatSession = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          tools: [{ functionDeclarations: [finalizeDealTool] }],
          systemInstruction: `You are a sales negotiator for MiniFlip. 
            Current Cart Total: ₹${cartTotal}. Items: ${itemsList}.
            Minimum Acceptable Price: ₹${minAcceptablePrice}.
            
            Rules:
            1. If the user offers a price >= ${minAcceptablePrice}, ACCEPT it immediately using the 'finalize_deal' tool.
            2. If the user offers < ${minAcceptablePrice}, politely counter-offer with a price slightly above ${minAcceptablePrice}.
            3. Be professional, concise, and helpful. Do not be rude.
            4. Do not ask too many questions. Focus on closing the deal.
          `,
        },
        history: messages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }))
      });

      const response = await chatSession.sendMessage({ 
        message: userMsg 
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'finalize_deal') {
          const finalPrice = Number(call.args.final_price);
          const discount = Math.max(0, cartTotal - finalPrice);
          
          setDealSealed(true);
          setMessages(prev => [...prev, { role: 'model', text: `Deal! Applying discount of ₹${discount}.` }]);
          
          setTimeout(() => {
            onFinalize(discount);
            onClose();
          }, 2000);
          return;
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: response.text || "Let me think about that..." }]);

    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the pricing server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (dealSealed) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center animate-in zoom-in text-center max-w-sm w-full">
           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
             <Tag size={32} />
           </div>
           <h3 className="text-xl font-bold text-gray-800 mb-2">Discount Applied!</h3>
           <p className="text-gray-500">You saved on this order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <h3 className="font-semibold">Negotiate Price</h3>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
             <div className="flex justify-start">
               <div className="bg-white px-4 py-2 rounded-lg rounded-tl-none border border-gray-200 text-gray-400 text-xs flex items-center gap-2">
                 <Loader2 className="animate-spin" size={12} /> typing...
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-gray-100 border-0 rounded-md px-3 py-2 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your offer..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              autoFocus
            />
            <button 
              onClick={handleSend} 
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-md transition font-medium"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Bargaining State
  const [showBargain, setShowBargain] = useState(false);
  const [extraDiscount, setExtraDiscount] = useState(0);

  useEffect(() => {
    setExtraDiscount(0);
  }, [cart.length, cart.reduce((acc, item) => acc + item.quantity, 0)]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalPayable = Math.max(0, totalAmount - extraDiscount);

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F2F4] font-sans text-gray-800">
      {/* Header */}
      <header className="bg-blue-600 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-white"><Menu size={24} /></button>
            <div className="flex flex-col cursor-pointer" onClick={() => {setSelectedCategory(null); setSearchTerm("");}}>
              <span className="font-bold text-xl italic tracking-wide text-white">MiniFlip</span>
              <span className="text-[10px] text-gray-200 -mt-1 flex items-center gap-0.5">Explore <span className="text-yellow-400 font-bold">Plus</span> <Star size={8} className="text-yellow-400 fill-yellow-400" /></span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl relative hidden sm:block">
            <input 
              type="text"
              placeholder="Search for products, brands and more"
              className="w-full bg-white text-sm px-4 py-2.5 rounded-sm shadow-sm focus:outline-none text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 text-blue-600" size={20} />
          </div>

          <div className="flex items-center gap-6">
            <button className="bg-white text-blue-600 px-6 py-1 font-semibold text-sm rounded-sm hover:bg-blue-50 transition hidden md:block">Login</button>
            <button className="text-white font-medium text-sm hidden md:block">More <ChevronDown size={14} className="inline" /></button>
            <div className="relative cursor-pointer flex items-center gap-2 text-white font-medium" onClick={() => setShowCart(true)}>
              <ShoppingCart size={20} />
              <span className="hidden md:inline text-sm">Cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-1 bg-yellow-400 text-blue-900 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                  {cart.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sub Header Categories */}
      <div className="bg-white shadow-sm mb-2 overflow-x-auto hide-scrollbar">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between min-w-max gap-8">
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors group ${
                selectedCategory === cat.id ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <div className={`p-2 rounded-full ${selectedCategory === cat.id ? 'bg-blue-50' : 'bg-gray-100 group-hover:bg-blue-50'}`}>
                {cat.icon}
              </div>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-2 sm:px-4 py-4 w-full">
        
        {/* Banner */}
        {!selectedCategory && !searchTerm && (
          <div className="mb-4 w-full bg-white p-1 shadow-sm overflow-hidden">
             <div className="w-full h-40 sm:h-64 bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-between px-8 sm:px-16 text-white relative">
                <div>
                  <h2 className="text-2xl sm:text-4xl font-bold mb-2">Big Savings Days</h2>
                  <p className="text-blue-100 text-lg">Up to 60% Off on Electronics</p>
                  <button className="mt-4 bg-yellow-400 text-blue-900 px-6 py-2 font-bold rounded-sm shadow-lg hover:bg-yellow-300 transition">Shop Now</button>
                </div>
                <div className="hidden sm:block opacity-30">
                   <ShoppingBag size={180} />
                </div>
             </div>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white shadow-sm rounded-sm">
            <div className="flex justify-center mb-4 text-gray-300">
              <Search size={64} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">No products found</h3>
            <p className="text-gray-500 mt-1">Try searching for something else.</p>
            <button onClick={() => {setSearchTerm(""); setSelectedCategory(null);}} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-sm text-sm font-medium">View All Products</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white p-4 flex flex-col relative hover:shadow-lg transition duration-200 rounded-sm border border-transparent hover:border-gray-200">
                <div className="relative aspect-[4/3] mb-4 flex items-center justify-center p-2">
                  <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain hover:scale-105 transition duration-300" />
                  <button className="absolute top-0 right-0 text-gray-400 hover:text-red-500 p-1">
                    <Heart size={18} />
                  </button>
                  {product.offer && (
                    <span className="absolute top-0 left-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
                      {product.offer}
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col">
                  <h3 className="font-medium text-gray-800 text-sm line-clamp-2 mb-1 hover:text-blue-600 cursor-pointer">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-1">
                     <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        {product.rating} <Star size={8} className="fill-white" />
                     </div>
                     <span className="text-xs text-gray-500">({product.reviews})</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-bold text-lg text-gray-900">₹{product.price.toLocaleString()}</span>
                    <span className="text-sm text-gray-500 line-through">₹{product.originalPrice.toLocaleString()}</span>
                    <span className="text-xs text-green-600 font-bold">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off
                    </span>
                  </div>
                  <div className="mt-auto">
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-full bg-yellow-400 text-blue-900 font-medium py-2 rounded-sm hover:bg-yellow-300 transition text-sm uppercase tracking-wide"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#172337] text-white py-12 mt-8 text-sm border-t border-[#454d5e]">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-gray-400 uppercase text-xs font-bold mb-4">About</h4>
              <ul className="space-y-2 text-xs">
                <li>Contact Us</li>
                <li>About Us</li>
                <li>Careers</li>
                <li>Press</li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-400 uppercase text-xs font-bold mb-4">Help</h4>
              <ul className="space-y-2 text-xs">
                <li>Payments</li>
                <li>Shipping</li>
                <li>Cancellation & Returns</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-400 uppercase text-xs font-bold mb-4">Policy</h4>
              <ul className="space-y-2 text-xs">
                <li>Return Policy</li>
                <li>Terms of Use</li>
                <li>Security</li>
                <li>Privacy</li>
              </ul>
            </div>
            <div className="border-l border-gray-600 pl-8 hidden md:block">
               <h4 className="text-gray-400 uppercase text-xs font-bold mb-4">Mail Us:</h4>
               <p className="text-xs leading-5">
                 MiniFlip Internet Private Limited,<br/>
                 Buildings Alyssa, Begonia &<br/>
                 Clove Embassy Tech Village,<br/>
                 Bengaluru, 560103,<br/>
                 Karnataka, India
               </p>
            </div>
         </div>
      </footer>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 flex items-center justify-between bg-blue-600 text-white">
              <h2 className="font-medium text-lg">My Cart ({cart.length})</h2>
              <button onClick={() => setShowCart(false)} className="hover:bg-blue-700 p-2 rounded transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-100 p-2 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 bg-white">
                  <ShoppingCart size={64} className="opacity-20" />
                  <p className="font-medium">Your cart is empty!</p>
                  <button onClick={() => setShowCart(false)} className="bg-blue-600 text-white px-6 py-2 rounded-sm text-sm shadow hover:bg-blue-700">Shop Now</button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 bg-white p-4 border border-gray-200 rounded-sm">
                    <div className="w-20 h-20 flex-shrink-0 p-2">
                       <img src={item.image} className="w-full h-full object-contain" alt={item.name} />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-50 hover:bg-gray-50">-</button>
                          <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50">+</button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-xs font-medium text-gray-400 uppercase hover:text-blue-600 text-left mt-2">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="bg-white p-4 shadow-inner">
                <div className="space-y-3 text-sm mb-4 text-gray-600 border-b border-dashed border-gray-300 pb-4">
                  <div className="flex justify-between">
                    <span>Price ({cart.length} items)</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  {extraDiscount > 0 && (
                     <div className="flex justify-between text-green-600 font-medium">
                       <span className="flex items-center gap-1"><Tag size={14} /> Negotiated Discount</span>
                       <span>- ₹{extraDiscount.toLocaleString()}</span>
                     </div>
                  )}
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 mb-4">
                  <span>Total Amount</span>
                  <span>₹{finalPayable.toLocaleString()}</span>
                </div>
                
                {/* Bargain Button */}
                {extraDiscount === 0 && (
                  <button 
                    onClick={() => setShowBargain(true)}
                    className="w-full mb-3 border border-gray-300 text-blue-600 py-3 rounded-sm font-medium text-sm hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    <Bot size={18} /> Negotiate Price
                  </button>
                )}

                <button className="w-full bg-orange-500 text-white py-3.5 rounded-sm font-bold text-sm hover:bg-orange-600 transition shadow-sm uppercase">
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bargain Modal */}
      {showBargain && (
        <BargainingModal 
          cartItems={cart} 
          cartTotal={totalAmount} 
          onClose={() => setShowBargain(false)} 
          onFinalize={(discount) => setExtraDiscount(discount)} 
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

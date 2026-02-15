// components/SommelierApp.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RestaurantData, MenuItem } from '@/types/menu';
import Footer from './Footer';
import LoginScreen from './LoginScreen';
import { getSession, clearSession } from '@/app/lib/session';

export default function SommelierApp() {
    const [menuData, setMenuData] = useState<RestaurantData | null>(null);
    const [restaurantName, setRestaurantName] = useState("Drops.");

    useEffect(() => {
        const session = getSession();
        if (session) {
            setMenuData(session.menuData);
            setRestaurantName(session.restaurantName);
        }
    }, []);

    const handleLogin = (data: RestaurantData, name: string) => {
        setMenuData(data);
        setRestaurantName(name);
    }

    const [selectedDishName, setSelectedDishName] = useState<string>('');
    const [selectedTier, setSelectedTier] = useState<'byGlass' | 'midRange' | 'exclusive'>('byGlass');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Find the selected item object from the flat list of all dishes
    const selectedItem = useMemo(() => {
        if (!menuData) return null;
        for (const cat of menuData.menu) {
            const found = cat.items.find((item) => item.dish === selectedDishName);
            if (found) return found;
        }
        return null;
    }, [selectedDishName, menuData]);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!menuData) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
            {/* Minimal Header */}
            <header className="mb-12 text-center space-y-2 sticky top-0 z-40 py-4 w-full backdrop-blur-xl bg-background/80 border-b border-white/20">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-4">
                    <a
                        href="/admin"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                        Admin
                    </a>
                    <button
                        onClick={() => {
                            clearSession();
                            setMenuData(null);
                            setRestaurantName("Drops.");
                        }}
                        className="text-xs font-medium bg-secondary/80 hover:bg-secondary px-3 py-1.5 rounded-full text-foreground transition-all duration-200"
                    >
                        Switch
                    </button>
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {restaurantName}
                </h1>
                <p className="text-muted-foreground text-[17px] leading-relaxed">
                    Your personal sommelier.
                </p>
            </header>

            <main className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
                {/* Left Column: Selection */}
                <div className="space-y-6 lg:sticky lg:top-32">
                    <div className="space-y-2">
                        <label className="block text-2xl font-semibold tracking-tight text-foreground">
                            Menu Selection
                        </label>
                        <p className="text-muted-foreground text-[17px] leading-relaxed">
                            Choose your dish to find the perfect pairing.
                        </p>
                    </div>

                    <div className="relative z-50 group" ref={dropdownRef}>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`w-full text-left p-4 rounded-2xl bg-white shadow-sm border border-transparent hover:shadow-md transition-all duration-300 flex justify-between items-center ${isDropdownOpen ? 'ring-2 ring-primary/20' : ''}`}
                        >
                            <span className={`text-[17px] ${selectedDishName ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {selectedDishName || "Select a dish..."}
                            </span>
                            <motion.span
                                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                                className="text-muted-foreground"
                            >
                                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </motion.span>
                        </motion.button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute top-full left-0 w-full mt-3 bg-white/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/20 max-h-[50vh] overflow-y-auto p-2 scrollbar-hide z-50 ring-1 ring-black/5"
                                >
                                    {menuData.menu.map((category) => (
                                        <div key={category.category} className="mb-2 last:mb-0">
                                            <div className="px-3 py-2 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-white/90 backdrop-blur-md z-10 rounded-lg">
                                                {category.category}
                                            </div>
                                            {category.items.map((item) => (
                                                <button
                                                    key={item.dish}
                                                    onClick={() => {
                                                        setSelectedDishName(item.dish);
                                                        setSelectedTier('byGlass');
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-3 rounded-xl text-[17px] transition-all duration-200 flex justify-between items-center group ${selectedDishName === item.dish
                                                        ? 'bg-secondary text-primary font-medium'
                                                        : 'hover:bg-secondary/50 text-foreground'
                                                        }`}
                                                >
                                                    <span>{item.dish}</span>
                                                    {item.price && <span className="text-[15px] text-muted-foreground">{item.price},-</span>}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Column: Recommendation */}
                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {selectedItem ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
                                className="w-full bg-white rounded-3xl shadow-lg border border-white/50 overflow-hidden relative"
                            >
                                <div className="p-8 space-y-8">
                                    {/* IOS Segmented Control */}
                                    <div className="bg-secondary/50 p-1 rounded-xl flex relative">
                                        {/* Animated Background Pill */}
                                        <div className="absolute inset-1 flex">
                                            {[
                                                { id: 'byGlass', label: 'Glass' },
                                                { id: 'midRange', label: 'Mid' },
                                                { id: 'exclusive', label: 'Exclusive' }
                                            ].map((tier, index) => {
                                                const isActive = selectedTier === tier.id;
                                                // Calculate approximate width (33.33%) for simplicity or let flexbox handle layout
                                                return null;
                                            })}
                                        </div>

                                        {[
                                            { id: 'byGlass', label: 'By the Glass' },
                                            { id: 'midRange', label: 'Mid-Range' },
                                            { id: 'exclusive', label: 'Exclusive' }
                                        ].map((tier) => (
                                            <button
                                                key={tier.id}
                                                onClick={() => setSelectedTier(tier.id as any)}
                                                className={`flex-1 relative z-10 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200 ${selectedTier === tier.id
                                                    ? 'bg-white text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                {tier.label}
                                            </button>
                                        ))}
                                    </div>

                                    <motion.div
                                        key={selectedTier}
                                        initial={{ opacity: 0, filter: "blur(4px)" }}
                                        animate={{ opacity: 1, filter: "blur(0px)" }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6 text-center"
                                    >
                                        <div className="space-y-1">
                                            <p className="text-[13px] font-semibold text-primary uppercase tracking-wide">
                                                {selectedItem.pairings[selectedTier].grape}
                                            </p>
                                            <h2 className="text-3xl font-semibold text-foreground tracking-tight leading-tight">
                                                {selectedItem.pairings[selectedTier].name}
                                            </h2>
                                        </div>

                                        <div className="flex justify-center gap-12 py-4 border-y border-secondary">
                                            <div className="text-center">
                                                <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Vintage</span>
                                                <span className="text-[17px] text-foreground font-medium">{selectedItem.pairings[selectedTier].vintage}</span>
                                            </div>
                                            <div className="bg-secondary w-px"></div>
                                            <div className="text-center">
                                                <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Price</span>
                                                <span className="text-[17px] text-foreground font-medium">{selectedItem.pairings[selectedTier].price},-</span>
                                            </div>
                                        </div>

                                        <p className="text-[17px] text-muted-foreground leading-relaxed italic">
                                            "{selectedItem.pairings[selectedTier].note}"
                                        </p>
                                    </motion.div>
                                </div>
                                {/* Subtle blur footer accent */}
                                <div className="h-1 bg-linear-to-r from-transparent via-primary/10 to-transparent"></div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-[400px] flex items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/20 border-dashed"
                            >
                                <p className="text-muted-foreground text-lg font-medium">
                                    Select a dish to find the perfect wine pairing.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <footer className="mt-auto py-8 text-center text-muted-foreground text-[11px] font-medium tracking-wide opacity-60">
                <Footer />
            </footer>
        </div>
    );
}
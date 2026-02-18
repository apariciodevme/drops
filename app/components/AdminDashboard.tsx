'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import { RestaurantData, MenuItem, Pairings, WinePairing } from '@/types/menu';
import { updateMenu } from '../actions/admin';
import { getTags, Tag } from '../actions/inventory';
import { generatePairings } from '../actions/pairing';
import { saveSession } from '@/app/lib/session';
import { TIERS, TIER_KEYS } from '@/app/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import WineInventory from './WineInventory';

// --- Types & Constants ---

interface AdminDashboardProps {
    initialData: RestaurantData;
    tenantId: string;
    restaurantName: string;
    onLogout: () => void;
}

const emptyWine: WinePairing = {
    name: '',
    grape: '',
    vintage: '',
    price: '',
    note: '',
    keywords: []
};

const emptyPairings: Pairings = {
    byGlass: { ...emptyWine },
    midRange: { ...emptyWine },
    exclusive: { ...emptyWine }
};

const emptyItem: MenuItem = {
    dish: '',
    price: '',
    pairings: { ...emptyPairings },
    tags: []
};

// --- Helper Components ---

interface MenuInputProps {
    label: string;
    value: string | number;
    onChange: (val: string) => void;
    type?: "text" | "textarea";
}

const MenuInput = memo(({ label, value, onChange, type = "text" }: MenuInputProps) => (
    <div className="flex flex-col space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase">{label}</label>
        {type === "textarea" ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-input bg-background/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
            />
        ) : (
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-input bg-background/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
        )}
    </div>
));
MenuInput.displayName = 'MenuInput';

// --- Main Component ---

export default function AdminDashboard({ initialData, tenantId, restaurantName, onLogout }: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'inventory'>('menu');
    const [data, setData] = useState<RestaurantData>(initialData);
    const [tags, setTags] = useState<Tag[]>([]); // For Dish Tagging
    const [isSaving, setIsSaving] = useState(false);
    const [isPairing, setIsPairing] = useState<string | null>(null); // "catIndex-itemIndex"
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    // Initialize all categories as closed by default
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
        initialData.menu.reduce((acc, cat) => ({ ...acc, [cat.category]: false }), {})
    );

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        // Fetch tags for menu editing
        getTags().then(setTags);
    }, []);

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage('');
        const result = await updateMenu(tenantId, data);
        setIsSaving(false);
        if (result.success) {
            // Update local session so the main app sees changes immediately
            saveSession({
                tenantId,
                restaurantName,
                menuData: data
            });
            setMessage('Menu updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Error updating menu: ' + result.error);
        }
    };

    const updateItem = (catIndex: number, itemIndex: number, newItem: MenuItem) => {
        const newData = structuredClone(data);
        newData.menu[catIndex].items[itemIndex] = newItem;
        setData(newData);
    };

    const toggleDishTag = (catIndex: number, itemIndex: number, tagId: string) => {
        const item = data.menu[catIndex].items[itemIndex];
        const currentTags = item.tags || [];
        let newTags;
        if (currentTags.includes(tagId)) {
            newTags = currentTags.filter(t => t !== tagId);
        } else {
            newTags = [...currentTags, tagId];
        }
        updateItem(catIndex, itemIndex, { ...item, tags: newTags });
    };

    const handleAutoPair = async (catIndex: number, itemIndex: number) => {
        const item = data.menu[catIndex].items[itemIndex];
        if (!item.tags || item.tags.length === 0) {
            alert("Please select at least one tag for this dish first.");
            return;
        }

        setIsPairing(`${catIndex}-${itemIndex}`);
        try {
            const result = await generatePairings(item.tags, tenantId);
            if ('error' in result) {
                alert("Error generating pairings: " + result.error);
            } else {
                const newItem = structuredClone(item);

                if (result.byGlass) {
                    newItem.pairings.byGlass = {
                        name: result.byGlass.name,
                        grape: result.byGlass.grape,
                        vintage: result.byGlass.vintage,
                        price: result.byGlass.price.toString(),
                        note: result.byGlass.description,
                        keywords: []
                    };
                }
                if (result.midRange) {
                    newItem.pairings.midRange = {
                        name: result.midRange.name,
                        grape: result.midRange.grape,
                        vintage: result.midRange.vintage,
                        price: result.midRange.price.toString(),
                        note: result.midRange.description,
                        keywords: []
                    };
                }
                if (result.exclusive) {
                    newItem.pairings.exclusive = {
                        name: result.exclusive.name,
                        grape: result.exclusive.grape,
                        vintage: result.exclusive.vintage,
                        price: result.exclusive.price.toString(),
                        note: result.exclusive.description,
                        keywords: []
                    };
                }

                updateItem(catIndex, itemIndex, newItem);
                setMessage("Generated pairings successfully!");
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate pairings.");
        } finally {
            setIsPairing(null);
        }
    };

    const addItem = (catIndex: number) => {
        const newData = structuredClone(data);
        const newItem = structuredClone(emptyItem);
        newData.menu[catIndex].items.push(newItem);
        setData(newData);
    };

    const removeItem = (catIndex: number, itemIndex: number) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;
        const newData = structuredClone(data);
        newData.menu[catIndex].items.splice(itemIndex, 1);
        setData(newData);
    };

    const filteredMenu = useMemo(() => {
        return data.menu.map((category, catIndex) => ({
            ...category,
            originalIndex: catIndex,
            items: category.items.map((item, itemIndex) => ({ ...item, originalIndex: itemIndex }))
                .filter(item =>
                    item.dish.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.price.toString().includes(searchTerm) ||
                    Object.values(item.pairings).some(pairing =>
                        pairing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        pairing.grape.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        pairing.vintage.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                )
        })).filter(category => category.items.length > 0);
    }, [data, searchTerm]);

    const scrollToCategory = (category: string) => {
        const element = document.getElementById(`category-${category}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Ensure it's open
            setOpenCategories(prev => ({ ...prev, [category]: true }));
            setMobileMenuOpen(false); // Close mobile menu after selection
        }
    };

    // Group tags for easier selection
    const groupedTags = useMemo(() => {
        const groups: Record<string, Tag[]> = {};
        tags.forEach(tag => {
            if (!groups[tag.category]) groups[tag.category] = [];
            groups[tag.category].push(tag);
        });
        return groups;
    }, [tags]);


    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans relative text-foreground transition-colors duration-300">

            {/* Mobile Header Bar */}
            <div className="md:hidden bg-card border-b border-border p-4 sticky top-0 z-50 flex items-center justify-between">
                <h1 className="text-lg font-bold text-foreground">{restaurantName}</h1>
                <div className="flex items-center gap-2">
                    {/* ThemeToggle Removed */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-muted-foreground hover:bg-secondary rounded-lg"
                    >
                        {mobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Sidebar Navigation (Desktop: Sidebar, Mobile: Drawer) */}
            <aside className={`
                bg-card border-r border-border 
                w-64 flex-shrink-0 
                fixed md:sticky top-[60px] md:top-0 h-[calc(100vh-60px)] md:h-screen 
                overflow-y-auto z-40 transition-transform duration-300 ease-in-out
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 border-b border-border hidden md:block">
                    <h1 className="text-xl font-bold text-foreground">{restaurantName} <span className="text-muted-foreground font-light block text-sm">Manager Dashboard</span></h1>
                </div>

                <nav className="p-4 space-y-1">
                    {/* Theme Toggle Section Removed */}

                    <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to App
                    </a>

                    <div className="space-y-1 pt-4 border-t border-border">
                        <button
                            onClick={() => { setActiveTab('menu'); setMobileMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'menu' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                        >
                            Menu Management
                        </button>
                        <button
                            onClick={() => { setActiveTab('inventory'); setMobileMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'inventory' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                        >
                            Wine Inventory
                        </button>
                    </div>

                    {activeTab === 'menu' && (
                        <>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-3">Sections</div>
                            {data.menu.map(cat => (
                                <button
                                    key={cat.category}
                                    onClick={() => scrollToCategory(cat.category)}
                                    className="w-full text-left px-3 py-2 text-sm text-foreground/80 rounded-md hover:bg-primary/10 hover:text-primary transition-colors truncate"
                                >
                                    {cat.category}
                                </button>
                            ))}
                        </>
                    )}
                </nav>

                <div className="p-4 mt-auto border-t border-border">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile when menu is open */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden top-[60px]"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-60px)] md:h-screen scroll-smooth">
                {activeTab === 'inventory' ? (
                    <WineInventory tenantId={tenantId} />
                ) : (
                    <>
                        {/* Header Actions */}
                        <header className="flex flex-col md:flex-row gap-4 mb-8 sticky top-0 md:top-0 bg-background/90 backdrop-blur-sm z-20 py-4 md:py-0 md:static">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search menu items, wines..."
                                    className="block w-full pl-10 pr-3 py-2 border border-input rounded-lg leading-5 bg-card placeholder-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm shadow-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                {message && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`text-sm font-medium px-3 py-1.5 rounded-full ${message.includes('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}
                                    >
                                        {message}
                                    </motion.span>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 ${isSaving ? 'animate-pulse' : ''}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </header>

                        <div className="space-y-8 max-w-4xl mx-auto pb-20">
                            {filteredMenu.map((category) => (
                                <div
                                    key={category.originalIndex}
                                    id={`category-${category.category}`}
                                    className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden"
                                >
                                    <button
                                        onClick={() => toggleCategory(category.category)}
                                        className="w-full flex items-center justify-between p-6 bg-card hover:bg-secondary/50 transition-colors text-left"
                                    >
                                        <h2 className="text-xl font-bold text-foreground">{category.category}</h2>
                                        <svg
                                            className={`w-6 h-6 text-muted-foreground transform transition-transform duration-200 ${openCategories[category.category] ? 'rotate-180' : ''}`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    <AnimatePresence>
                                        {openCategories[category.category] && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-6 pt-0 space-y-6 border-t border-border">
                                                    {category.items.map((item) => (
                                                        <div key={item.originalIndex} className="bg-secondary/20 rounded-xl border border-border p-6 space-y-6 relative group">
                                                            <button
                                                                onClick={() => removeItem(category.originalIndex, item.originalIndex)}
                                                                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                title="Delete Dish"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                            </button>

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pr-12">
                                                                <div className="md:col-span-2">
                                                                    <MenuInput label="Dish Name" value={item.dish} onChange={(val) => updateItem(category.originalIndex, item.originalIndex, { ...item, dish: val })} />
                                                                </div>
                                                                <MenuInput label="Price" value={item.price} onChange={(val) => updateItem(category.originalIndex, item.originalIndex, { ...item, price: val })} />
                                                            </div>

                                                            {/* Dish Tags */}
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-muted-foreground uppercase">Flavor Profile Tags</label>
                                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded bg-background/30">
                                                                    {Object.entries(groupedTags).map(([cat, catTags]) => (
                                                                        <div key={cat} className="w-full">
                                                                            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 mt-2 first:mt-0">{cat}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {catTags.map(tag => {
                                                                                    const isSelected = (item.tags || []).includes(tag.id);
                                                                                    return (
                                                                                        <button
                                                                                            key={tag.id}
                                                                                            onClick={() => toggleDishTag(category.originalIndex, item.originalIndex, tag.id)}
                                                                                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${isSelected
                                                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                                                : 'bg-card text-foreground border-border hover:border-primary/50'
                                                                                                }`}
                                                                                        >
                                                                                            {tag.name}
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Pairings */}
                                                            <div className="bg-card p-5 rounded-lg border border-border shadow-sm space-y-4">
                                                                <div className="flex justify-between items-center">
                                                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v18" /></svg>
                                                                        Wine Pairings
                                                                    </h3>

                                                                    <button
                                                                        onClick={() => handleAutoPair(category.originalIndex, item.originalIndex)}
                                                                        disabled={isPairing === `${category.originalIndex}-${item.originalIndex}`}
                                                                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                                                                    >
                                                                        {isPairing === `${category.originalIndex}-${item.originalIndex}` ? (
                                                                            <>
                                                                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                                Generating...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                                                Auto-Pair AI
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-border">
                                                                    {TIER_KEYS.map((tier) => (
                                                                        <div key={tier} className="space-y-3 pt-4 lg:pt-0 lg:pl-6 first:pl-0 first:pt-0">
                                                                            <div className={`text-xs font-bold uppercase mb-2 pb-1 border-b ${tier === 'byGlass' ? 'text-blue-600 border-blue-100 dark:text-blue-400 dark:border-blue-900' :
                                                                                tier === 'midRange' ? 'text-purple-600 border-purple-100 dark:text-purple-400 dark:border-purple-900' : 'text-amber-600 border-amber-100 dark:text-amber-400 dark:border-amber-900'
                                                                                }`}>
                                                                                {TIERS[tier]}
                                                                            </div>
                                                                            <MenuInput label="Name" value={item.pairings[tier].name} onChange={(val) => {
                                                                                const newItem = structuredClone(item);
                                                                                newItem.pairings[tier].name = val;
                                                                                updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                            }} />
                                                                            <MenuInput label="Grape" value={item.pairings[tier].grape} onChange={(val) => {
                                                                                const newItem = structuredClone(item);
                                                                                newItem.pairings[tier].grape = val;
                                                                                updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                            }} />
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <MenuInput label="Vintage" value={item.pairings[tier].vintage} onChange={(val) => {
                                                                                    const newItem = structuredClone(item);
                                                                                    newItem.pairings[tier].vintage = val;
                                                                                    updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                                }} />
                                                                                <MenuInput label="Price" value={item.pairings[tier].price} onChange={(val) => {
                                                                                    const newItem = structuredClone(item);
                                                                                    newItem.pairings[tier].price = val;
                                                                                    updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                                }} />
                                                                            </div>
                                                                            <MenuInput type="textarea" label="Note" value={item.pairings[tier].note} onChange={(val) => {
                                                                                const newItem = structuredClone(item);
                                                                                newItem.pairings[tier].note = val;
                                                                                updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                            }} />
                                                                            <MenuInput type="textarea" label="Description" value={item.pairings[tier].description || ''} onChange={(val) => {
                                                                                const newItem = structuredClone(item);
                                                                                newItem.pairings[tier].description = val;
                                                                                updateItem(category.originalIndex, item.originalIndex, newItem);
                                                                            }} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => addItem(category.originalIndex)}
                                                        className="w-full py-4 bg-card hover:bg-secondary/50 text-muted-foreground font-medium rounded-xl border-2 border-dashed border-border transition-all hover:border-primary hover:text-primary flex items-center justify-center gap-2 group"
                                                    >
                                                        <span className="bg-secondary group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary rounded-full w-8 h-8 flex items-center justify-center transition-colors font-bold text-lg">+</span>
                                                        Add Dish to {category.category}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

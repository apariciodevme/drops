'use client';

import React, { useState } from 'react';
import { RestaurantData, MenuCategory, MenuItem, Pairings, WinePairing } from '@/types/menu';
import { updateMenu } from '../actions/admin';
import { motion, AnimatePresence } from 'framer-motion';

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
    note: ''
};

const emptyPairings: Pairings = {
    byGlass: { ...emptyWine },
    midRange: { ...emptyWine },
    exclusive: { ...emptyWine }
};

const emptyItem: MenuItem = {
    dish: '',
    price: '',
    pairings: { ...emptyPairings }
};

export default function AdminDashboard({ initialData, tenantId, restaurantName, onLogout }: AdminDashboardProps) {
    const [data, setData] = useState<RestaurantData>(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setMessage('');
        const result = await updateMenu(tenantId, data);
        setIsSaving(false);
        if (result.success) {
            setMessage('Menu updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Error updating menu: ' + result.error);
        }
    };

    const updateItem = (catIndex: number, itemIndex: number, newItem: MenuItem) => {
        const newData = { ...data };
        newData.menu[catIndex].items[itemIndex] = newItem;
        setData(newData);
    };

    const addItem = (catIndex: number) => {
        const newData = { ...data };
        // Deep copy empty item to avoid reference issues
        const newItem = JSON.parse(JSON.stringify(emptyItem));
        newData.menu[catIndex].items.push(newItem);
        setData(newData);
    };

    const removeItem = (catIndex: number, itemIndex: number) => {
        if (!confirm('Are you sure you want to delete this dish?')) return;
        const newData = { ...data };
        newData.menu[catIndex].items.splice(itemIndex, 1);
        setData(newData);
    };

    const filteredMenu = data.menu.map((category, catIndex) => ({
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

    // Simple recursive input for deep objects
    const renderInput = (label: string, value: string | number, onChange: (val: string) => void, type = "text") => (
        <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <header className="flex flex-col gap-6 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4 z-40">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            Back to App
                        </a>
                        <h1 className="text-2xl font-bold text-gray-900">{restaurantName} <span className="text-gray-400 font-light">Manager</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {message && <span className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{message}</span>}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={onLogout}
                            className="text-gray-500 hover:text-gray-700 font-medium text-sm"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search menu items, wines, grapes..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="space-y-12 max-w-5xl mx-auto">
                {filteredMenu.map((category) => (
                    <div key={category.originalIndex} className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2">{category.category}</h2>
                        <div className="grid gap-6">
                            {category.items.map((item) => (
                                <div key={item.originalIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pr-8">
                                            {renderInput("Dish Name", item.dish, (val) => updateItem(category.originalIndex, item.originalIndex, { ...item, dish: val }))}
                                            {renderInput("Price", item.price, (val) => updateItem(category.originalIndex, item.originalIndex, { ...item, price: val }))}
                                        </div>
                                        <button onClick={() => removeItem(category.originalIndex, item.originalIndex)} className="text-red-500 hover:text-red-700 p-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        </button>
                                    </div>

                                    {/* Pairings */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Wine Pairings</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {(['byGlass', 'midRange', 'exclusive'] as const).map((tier) => (
                                                <div key={tier} className="space-y-2">
                                                    <div className="text-xs font-bold text-blue-600 uppercase mb-2 border-b border-blue-100 pb-1">
                                                        {tier === 'byGlass' ? 'By The Glass' : tier === 'midRange' ? 'Mid-Range' : 'Exclusive'}
                                                    </div>
                                                    {renderInput("Name", item.pairings[tier].name, (val) => {
                                                        const newItem = { ...item };
                                                        newItem.pairings[tier].name = val;
                                                        updateItem(category.originalIndex, item.originalIndex, newItem);
                                                    })}
                                                    {renderInput("Grape", item.pairings[tier].grape, (val) => {
                                                        const newItem = { ...item };
                                                        newItem.pairings[tier].grape = val;
                                                        updateItem(category.originalIndex, item.originalIndex, newItem);
                                                    })}
                                                    {renderInput("Vintage", item.pairings[tier].vintage, (val) => {
                                                        const newItem = { ...item };
                                                        newItem.pairings[tier].vintage = val;
                                                        updateItem(category.originalIndex, item.originalIndex, newItem);
                                                    }, "text")}
                                                    {renderInput("Price", item.pairings[tier].price, (val) => {
                                                        const newItem = { ...item };
                                                        newItem.pairings[tier].price = val;
                                                        updateItem(category.originalIndex, item.originalIndex, newItem);
                                                    })}
                                                    {renderInput("Note", item.pairings[tier].note, (val) => {
                                                        const newItem = { ...item };
                                                        newItem.pairings[tier].note = val;
                                                        updateItem(category.originalIndex, item.originalIndex, newItem);
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => addItem(category.originalIndex)}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl border border-dashed border-gray-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">+</span> Add Dish to {category.category}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

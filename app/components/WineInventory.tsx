'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tag, Wine, getTags, getWines, saveWine, deleteWine } from '@/app/actions/inventory';
import { motion, AnimatePresence } from 'framer-motion';

interface WineInventoryProps {
    tenantId: string;
}

export default function WineInventory({ tenantId }: WineInventoryProps) {
    const [wines, setWines] = useState<Wine[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingWine, setEditingWine] = useState<Partial<Wine> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, [tenantId]);

    const loadData = async () => {
        setIsLoading(true);
        const [fetchedTags, fetchedWines] = await Promise.all([
            getTags(),
            getWines(tenantId)
        ]);
        setTags(fetchedTags);
        setWines(fetchedWines);
        setIsLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWine || !editingWine.name) return;

        setIsSaving(true);
        const wineToSave = {
            ...editingWine,
            tenant_id: tenantId,
            tags: editingWine.tags || []
        } as Wine;

        const result = await saveWine(wineToSave);
        setIsSaving(false);

        if (result.success) {
            setEditingWine(null);
            loadData(); // Reload to get IDs and fresh data
        } else {
            alert('Error saving wine: ' + result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const result = await deleteWine(id);
        if (result.success) {
            loadData();
        } else {
            alert('Error deleting wine');
        }
    };

    const toggleTag = (tagId: string) => {
        if (!editingWine) return;
        const currentTags = editingWine.tags || [];
        const exists = currentTags.find(t => t.tag_id === tagId);

        if (exists) {
            setEditingWine({
                ...editingWine,
                tags: currentTags.filter(t => t.tag_id !== tagId)
            });
        } else {
            setEditingWine({
                ...editingWine,
                tags: [...currentTags, { tag_id: tagId, weight: 5 }] // Default weight
            });
        }
    };

    const groupedTags = useMemo(() => {
        const groups: Record<string, Tag[]> = {};
        tags.forEach(tag => {
            if (!groups[tag.category]) groups[tag.category] = [];
            groups[tag.category].push(tag);
        });
        return groups;
    }, [tags]);

    const filteredWines = wines.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.grape.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-foreground">Wine Inventory</h2>
                <button
                    onClick={() => setEditingWine({
                        tenant_id: tenantId,
                        name: '',
                        grape: '',
                        vintage: '',
                        price: 0,
                        description: '',
                        stock_status: 'in_stock',
                        tags: []
                    })}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                    + Add Wine
                </button>
            </div>

            <input
                type="text"
                placeholder="Search inventory..."
                className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredWines.map(wine => (
                        <div key={wine.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg text-foreground">{wine.name}</h3>
                                    <p className="text-sm text-muted-foreground">{wine.grape} • {wine.vintage}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${wine.stock_status === 'in_stock' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {wine.stock_status === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-4">
                                {wine.tags?.map(wt => {
                                    const tag = tags.find(t => t.id === wt.tag_id);
                                    return tag ? (
                                        <span key={wt.tag_id} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                            {tag.name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setEditingWine(wine)}
                                    className="text-sm text-primary hover:underline"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(wine.id!)}
                                    className="text-sm text-destructive hover:underline"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal (Inline for now) */}
            <AnimatePresence>
                {editingWine && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setEditingWine(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold mb-4 text-foreground">{editingWine.id ? 'Edit Wine' : 'Add New Wine'}</h2>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Name</label>
                                        <input
                                            required
                                            className="w-full p-2 bg-secondary/50 rounded border border-border"
                                            value={editingWine.name || ''}
                                            onChange={e => setEditingWine({ ...editingWine, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Grape</label>
                                        <input
                                            className="w-full p-2 bg-secondary/50 rounded border border-border"
                                            value={editingWine.grape || ''}
                                            onChange={e => setEditingWine({ ...editingWine, grape: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Vintage</label>
                                        <input
                                            className="w-full p-2 bg-secondary/50 rounded border border-border"
                                            value={editingWine.vintage || ''}
                                            onChange={e => setEditingWine({ ...editingWine, vintage: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Price</label>
                                        <input
                                            type="number"
                                            className="w-full p-2 bg-secondary/50 rounded border border-border"
                                            value={editingWine.price || 0}
                                            onChange={e => setEditingWine({ ...editingWine, price: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Description</label>
                                    <textarea
                                        className="w-full p-2 bg-secondary/50 rounded border border-border min-h-[80px]"
                                        value={editingWine.description || ''}
                                        onChange={e => setEditingWine({ ...editingWine, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                                    <select
                                        className="w-full p-2 bg-secondary/50 rounded border border-border"
                                        value={editingWine.stock_status || 'in_stock'}
                                        onChange={e => setEditingWine({ ...editingWine, stock_status: e.target.value as any })}
                                    >
                                        <option value="in_stock">In Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                    </select>
                                </div>

                                {/* Tags Section */}
                                <div className="space-y-2 pt-2 border-t border-border">
                                    <label className="text-sm font-bold text-foreground">Flavor Profile Tags</label>
                                    <div className="space-y-3">
                                        {Object.entries(groupedTags).map(([category, catTags]) => (
                                            <div key={category}>
                                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">{category}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {catTags.map(tag => {
                                                        const isSelected = editingWine.tags?.some(t => t.tag_id === tag.id);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={tag.id}
                                                                onClick={() => toggleTag(tag.id)}
                                                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${isSelected
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

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingWine(null)}
                                        className="px-4 py-2 text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Wine'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

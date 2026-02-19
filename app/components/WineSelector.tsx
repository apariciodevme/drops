
import React, { useState, useEffect, useRef } from 'react';
import { Wine } from '../actions/inventory';

interface WineSelectorProps {
    wines: Wine[];
    onSelect: (wine: Wine) => void;
    currentWineId?: string | null;
}

export default function WineSelector({ wines, onSelect, currentWineId }: WineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredWines = wines.filter(wine =>
        wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wine.grape.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedWine = wines.find(w => w.id === currentWineId);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Link Inventory Wine</label>

            <div
                className="flex items-center justify-between border border-input bg-background/50 rounded-md px-3 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-col truncate">
                    {selectedWine ? (
                        <>
                            <span className="font-medium text-foreground">{selectedWine.name}</span>
                            <span className="text-xs text-muted-foreground">{selectedWine.vintage} • {selectedWine.grape}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground/70 italic">Select a wine from inventory...</span>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-card p-2 border-b border-border">
                        <input
                            type="text"
                            placeholder="Search wines..."
                            className="w-full px-2 py-1 bg-secondary/50 border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {filteredWines.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">No wines found</div>
                    ) : (
                        <div className="py-1">
                            {filteredWines.map(wine => (
                                <button
                                    key={wine.id}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors flex flex-col ${wine.id === currentWineId ? 'bg-primary/5' : ''}`}
                                    onClick={() => {
                                        onSelect(wine);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    <span className="font-medium">{wine.name}</span>
                                    <span className="text-xs text-muted-foreground">{wine.vintage} • {wine.grape}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

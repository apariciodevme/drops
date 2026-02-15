'use client';

import { useState, useEffect } from 'react';
import { authenticateAndLoad } from '../actions/auth';
import { motion } from 'framer-motion';
import { RestaurantData } from '@/types/menu';
import { saveSession } from '@/app/lib/session';

interface LoginScreenProps {
    onLogin: (data: RestaurantData, name: string, tenantId?: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleNumberClick = (num: string) => {
        if (code.length < 4) {
            setCode((prev) => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setCode((prev) => prev.slice(0, -1));
        setError('');
    };

    const handleSubmit = async () => {
        if (code.length !== 4) return;

        setIsLoading(true);

        const result = await authenticateAndLoad(code); // Server Action

        if (result.success && result.data) {
            if (result.tenantId) {
                saveSession({
                    tenantId: result.tenantId,
                    restaurantName: result.restaurantName || "Sommelier",
                    menuData: result.data
                });
            }
            onLogin(result.data, result.restaurantName || "Sommelier", result.tenantId);
        } else {
            setError(result?.error || 'Invalid code');
            setIsLoading(false);
            setCode('');
        }
    };

    // Auto-submit when code reaches 4 digits
    useEffect(() => {
        if (code.length === 4 && !isLoading) {
            handleSubmit();
        }
    }, [code, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                        Drops.
                    </h1>
                    <p className="text-[#86868b] text-[17px]">
                        Enter access code
                    </p>
                </div>

                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border transition-all duration-300 ${i < code.length
                                ? 'bg-[#1d1d1f] border-[#1d1d1f]'
                                : 'border-[#d1d1d6] bg-transparent'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-[#ff3b30] text-[15px] font-medium"
                    >
                        {error}
                    </motion.p>
                )}

                <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="w-20 h-20 rounded-full bg-white text-2xl font-medium text-[#1d1d1f] shadow-sm hover:bg-[#e5e5ea] active:scale-95 transition-all flex items-center justify-center"
                            disabled={isLoading}
                        >
                            {num}
                        </button>
                    ))}
                    <div className="w-20 h-20" /> {/* Empty slot */}
                    <button
                        onClick={() => handleNumberClick('0')}
                        className="w-20 h-20 rounded-full bg-white text-2xl font-medium text-[#1d1d1f] shadow-sm hover:bg-[#e5e5ea] active:scale-95 transition-all flex items-center justify-center"
                        disabled={isLoading}
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-20 h-20 rounded-full text-lg font-medium text-[#1d1d1f] hover:bg-transparent active:scale-95 transition-all flex items-center justify-center"
                        disabled={isLoading}
                    >
                        ⌫
                    </button>
                </div>
            </div>
        </div>
    );
}

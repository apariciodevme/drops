'use client';

import { useState, useEffect } from 'react';
import { authenticateAndLoad } from '../actions/auth';
import { motion, AnimatePresence } from 'framer-motion';
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

        try {
            const result = await authenticateAndLoad(code); // Server Action

            if (result.success && result.data) {
                if (result.tenantId) {
                    saveSession({
                        tenantId: result.tenantId,
                        restaurantName: result.restaurantName || "Drops",
                        menuData: result.data
                    });
                }
                onLogin(result.data, result.restaurantName || "Drops", result.tenantId);
            } else {
                setError(result?.error || 'Invalid code');
                setIsLoading(false);
                setCode('');
            }
        } catch (err) {
            console.error("Login error:", err);
            setError('System error. Please try again.');
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
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 font-sans text-white overflow-hidden relative">
            {/* Background Ambient Glow */}
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white/3 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-sm space-y-12 relative z-10"
            >
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white font-serif italic">
                        Drops.
                    </h1>
                    <p className="text-white/40 text-[15px] uppercase tracking-widest font-medium">
                        Enter Access Code
                    </p>
                </div>

                {/* Input Indicators */}
                <div className="flex justify-center gap-6 mb-12">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-3.5 h-3.5 rounded-full border border-white/30 transition-all duration-200 ${i < code.length ? 'bg-white scale-110' : 'bg-transparent scale-100'
                                }`}
                        />
                    ))}
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            className="text-center"
                        >
                            <p className="text-rose-400 text-[14px] font-medium tracking-wide bg-rose-500/10 py-2 px-4 rounded-lg inline-block border border-rose-500/20">
                                {error}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-x-6 gap-y-6 max-w-[300px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-2xl font-light text-white shadow-lg shadow-black/20 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-100 flex items-center justify-center touch-manipulation"
                            disabled={isLoading}
                        >
                            {num}
                        </button>
                    ))}
                    <div className="w-20 h-20" /> {/* Empty slot */}
                    <button
                        onClick={() => handleNumberClick('0')}
                        className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-2xl font-light text-white shadow-lg shadow-black/20 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all duration-100 flex items-center justify-center touch-manipulation"
                        disabled={isLoading}
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-20 h-20 rounded-full text-xl font-medium text-white/50 hover:text-white active:scale-90 transition-all duration-100 flex items-center justify-center touch-manipulation"
                        disabled={isLoading}
                    >
                        ⌫
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

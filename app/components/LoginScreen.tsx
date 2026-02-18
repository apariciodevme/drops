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
        <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans text-[#1d1d1f] overflow-hidden relative">
            {/* Ambient Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
            <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-pink-200/40 rounded-full blur-[80px] pointer-events-none mix-blend-multiply" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[320px] relative z-10 bg-white/40 backdrop-blur-xl border border-white/50 shadow-xl shadow-black/5 rounded-[2rem] p-8"
            >
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                        Drops.
                    </h1>
                    <p className="text-[#1d1d1f]/60 text-[15px] font-medium">
                        Enter access code
                    </p>
                </div>

                {/* Input Indicators */}
                <div className="flex justify-center gap-5 mb-8">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-3.5 h-3.5 rounded-full border border-[#1d1d1f]/20 transition-all duration-200 ${i < code.length ? 'bg-[#1d1d1f] scale-110 border-[#1d1d1f]' : 'bg-transparent scale-100'
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
                            className="text-center mb-6"
                        >
                            <p className="text-rose-600 text-[14px] font-medium tracking-wide bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 inline-block">
                                {error}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-4 mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            className="w-16 h-16 rounded-full bg-white/50 border border-white/60 text-xl font-medium text-[#1d1d1f] hover:bg-white/80 active:scale-95 transition-all duration-100 flex items-center justify-center touch-manipulation shadow-sm shadow-black/5 mx-auto"
                            disabled={isLoading}
                        >
                            {num}
                        </button>
                    ))}
                    <div className="w-16 h-16 mx-auto" /> {/* Empty slot */}
                    <button
                        onClick={() => handleNumberClick('0')}
                        className="w-16 h-16 rounded-full bg-white/50 border border-white/60 text-xl font-medium text-[#1d1d1f] hover:bg-white/80 active:scale-95 transition-all duration-100 flex items-center justify-center touch-manipulation shadow-sm shadow-black/5 mx-auto"
                        disabled={isLoading}
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-16 h-16 rounded-full text-lg font-medium text-[#1d1d1f]/50 hover:text-[#1d1d1f] active:scale-95 transition-all duration-100 flex items-center justify-center touch-manipulation mx-auto"
                        disabled={isLoading}
                    >
                        ⌫
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

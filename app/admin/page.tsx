'use client';

import { useState, useEffect } from 'react';
import LoginScreen from '../components/LoginScreen';
import AdminDashboard from '../components/AdminDashboard';
import { RestaurantData } from '@/types/menu';
import { getSession, clearSession } from '@/app/lib/session';

export default function AdminPage() {
    const [authData, setAuthData] = useState<{
        data: RestaurantData;
        name: string;
        tenantId: string;
    } | null>(null);

    useEffect(() => {
        const session = getSession();
        if (session) {
            setAuthData({
                data: session.menuData,
                name: session.restaurantName,
                tenantId: session.tenantId
            });
        }
    }, []);

    // Initial load, show login
    if (!authData) {
        return (
            <LoginScreen
                onLogin={(data, name, tenantId) => {
                    if (tenantId) {
                        setAuthData({ data, name, tenantId });
                    } else {
                        alert("Error: No tenant ID found. Please report this.");
                    }
                }}
            />
        );
    }

    return (
        <AdminDashboard
            initialData={authData.data}
            tenantId={authData.tenantId}
            restaurantName={authData.name}
            onLogout={() => {
                clearSession();
                setAuthData(null);
            }}
        />
    );
}

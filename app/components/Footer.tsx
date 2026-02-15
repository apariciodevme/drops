import React from 'react'

const Footer = () => {
    return (
        <footer className="w-full py-6 text-center text-slate-500 text-sm font-light">
            <p>&copy; {new Date().getFullYear()} Developed by Facundo Aparicio </p>
        </footer>
    )
}

export default Footer
import React, { useEffect, useState } from 'react';

export default function MessagePopup({ message, subtitle, visible, type = "standard", onClose, autoHideDuration = 3000 }) {
    const [isVisible, setIsVisible] = useState(visible);

    useEffect(() => {
        setIsVisible(visible);
    }, [visible]);

    useEffect(() => {
        if (isVisible && autoHideDuration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                onClose?.();
            }, autoHideDuration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, autoHideDuration, onClose]);

    if (!isVisible) return null;

    const typeStyles = {
        error: {
            bg: "bg-red-900/90",
            border: "border-red-500",
            text: "text-red-200",
            title: "text-red-300",
        },
        success: {
            bg: "bg-green-900/90",
            border: "border-green-500",
            text: "text-green-200",
            title: "text-green-300",
        },
        standard: {
            bg: "bg-BrandBlack2",
            border: "border-BrandOrange",
            text: "text-BrandOrange",
            title: "text-BrandOrange",
        },
    };

    const styles = typeStyles[type] || typeStyles.standard;

    return (
        <div className={`flex flex-col items-center justify-center absolute top-[10px] left-1/2 -translate-x-1/2 z-[100] p-2 sm:p-2.5 rounded-md ${styles.bg} border-[1px] ${styles.border} shadow-lg min-w-[150px] sm:min-w-[200px] max-w-[90vw] transition-opacity duration-300`}>
            <h2 className={`${styles.title} text-xs sm:text-sm font-DmSans font-semibold mb-0.5`}>{message}</h2>
            {subtitle && (
                <p className={`${styles.text} text-[10px] sm:text-xs font-DmSans`}>{subtitle}</p>
            )}
        </div>
    );
}

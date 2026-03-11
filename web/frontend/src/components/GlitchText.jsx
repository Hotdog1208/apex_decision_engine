import React from 'react';

export default function GlitchText({ text, className = "", as: Component = "span" }) {
    // We'll duplicate the text in pseudo-elements using CSS, 
    // but we can pass the text via a data attribute so CSS can read it.
    return (
        <Component
            className={`relative inline-block glitch-layer ${className}`}
            data-text={text}
        >
            {text}
        </Component>
    );
}

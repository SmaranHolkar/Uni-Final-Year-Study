// Renders a reusable card component with shared visual styles.
import React from 'react';

const cardStyles = {
    card: {
        background: 'var(--card, #fff)',
        borderRadius: '1.2rem',
        boxShadow: '0 2px 16px #6366f122',
        padding: '2rem 1.7rem',
        minWidth: 220,
        maxWidth: 320,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        margin: '0.5rem',
        border: '1px solid var(--border, #e5e7eb)',
        transition: 'box-shadow 0.2s, transform 0.2s',
    },
    image: {
        width: '64px',
        height: '64px',
        objectFit: 'contain',
        marginBottom: '1rem',
        borderRadius: '0.7rem',
        background: 'var(--muted, #f3f4f6)',
        boxShadow: '0 1px 4px #6366f111',
    },
    title: {
        fontWeight: 700,
        fontSize: '1.2rem',
        color: 'var(--foreground, #1e293b)',
        marginBottom: '0.5rem',
    },
    description: {
        color: 'var(--muted-foreground, #64748b)',
        fontSize: '1rem',
        marginBottom: '0.5rem',
    },
};

// Displays a stylized card with optional image and custom child content.
const Card = ({ title, description, image, onClick, children }) => {
    return (
        <div className="card" style={cardStyles.card} onClick={onClick}>
            {image && <img src={image} alt={title} className="card-image" style={cardStyles.image} />}
            <div className="card-content">
                {title && <h3 className="card-title" style={cardStyles.title}>{title}</h3>}
                {description && <p className="card-description" style={cardStyles.description}>{description}</p>}
                {children}
            </div>
        </div>
    );
};

export default Card;

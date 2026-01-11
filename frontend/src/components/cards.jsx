import React from 'react';
import './cards.css';

const Card = ({ title, description, image, onClick, children }) => {
    return (
        <div className="card" onClick={onClick}>
            {image && <img src={image} alt={title} className="card-image" />}
            <div className="card-content">
                {title && <h3 className="card-title">{title}</h3>}
                {description && <p className="card-description">{description}</p>}
                {children}
            </div>
        </div>
    );
};

export default Card;
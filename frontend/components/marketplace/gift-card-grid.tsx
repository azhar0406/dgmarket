'use client';

import React from 'react';
import { GiftCardItem } from './gift-card-item';

// Mock data for demonstration
const mockGiftCards = [
  {
    id: '1',
    brand: 'Amazon',
    category: 'retail',
    value: 50,
    price: 45,
    discount: 10,
    image: 'https://images.pexels.com/photos/1435752/pexels-photo-1435752.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x1234...5678',
    createdAt: new Date('2024-01-15'),
    isVerified: true,
  },
  {
    id: '2',
    brand: 'Starbucks',
    category: 'dining',
    value: 25,
    price: 22,
    discount: 12,
    image: 'https://images.pexels.com/photos/3807755/pexels-photo-3807755.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x2345...6789',
    createdAt: new Date('2024-01-14'),
    isVerified: true,
  },
  {
    id: '3',
    brand: 'Netflix',
    category: 'entertainment',
    value: 15,
    price: 14,
    discount: 7,
    image: 'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x3456...7890',
    createdAt: new Date('2024-01-13'),
    isVerified: false,
  },
  {
    id: '4',
    brand: 'Steam',
    category: 'gaming',
    value: 100,
    price: 90,
    discount: 10,
    image: 'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x4567...8901',
    createdAt: new Date('2024-01-12'),
    isVerified: true,
  },
  {
    id: '5',
    brand: 'Apple',
    category: 'tech',
    value: 200,
    price: 180,
    discount: 10,
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x5678...9012',
    createdAt: new Date('2024-01-11'),
    isVerified: true,
  },
  {
    id: '6',
    brand: 'Airbnb',
    category: 'travel',
    value: 75,
    price: 70,
    discount: 7,
    image: 'https://images.pexels.com/photos/1288482/pexels-photo-1288482.jpeg?auto=compress&cs=tinysrgb&w=400',
    seller: '0x6789...0123',
    createdAt: new Date('2024-01-10'),
    isVerified: true,
  },
];

interface GiftCardGridProps {
  sortBy: string;
  priceRange: number[];
}

export function GiftCardGrid({ sortBy, priceRange }: GiftCardGridProps) {
  // Filter and sort logic would go here
  const filteredCards = mockGiftCards.filter(
    card => card.price >= priceRange[0] && card.price <= priceRange[1]
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing {filteredCards.length} gift cards
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCards.map((card) => (
          <GiftCardItem key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
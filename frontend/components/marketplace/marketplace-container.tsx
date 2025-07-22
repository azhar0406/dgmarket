'use client';

import React, { useState } from 'react';
import { MarketplaceFilters } from './marketplace-filters';
import { GiftCardGrid } from './gift-card-grid';
import { MarketplaceHeader } from './marketplace-header';

export function MarketplaceContainer() {
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState([0, 1000]);

  return (
    <div className="space-y-8">
      <MarketplaceHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <MarketplaceFilters
            sortBy={sortBy}
            setSortBy={setSortBy}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
          />
        </div>
        
        <div className="lg:col-span-3">
          <GiftCardGrid sortBy={sortBy} priceRange={priceRange} />
        </div>
      </div>
    </div>
  );
}